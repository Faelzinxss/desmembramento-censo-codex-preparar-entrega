-- PREPARADO, NÃO APLICADO. Requer LOTES_01 e LOTES_02.
-- Confirma uma prévia em transação única, sem alterar a distribuição legada/fila.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.lote_operacoes (
    id uuid primary key,
    criado_por uuid not null references public.perfis(id),
    pedido jsonb not null,
    criado_em timestamptz not null default statement_timestamp()
);
alter table public.lote_operacoes enable row level security;
revoke all on public.lote_operacoes from public, anon, authenticated;

alter table public.lotes
    add constraint lotes_operacao_fk foreign key (operacao_id)
    references public.lote_operacoes(id);

create function public.confirmar_lotes_web(
    p_snapshot_id uuid,
    p_operacao_id uuid,
    p_nome text,
    p_municipio text,
    p_tipo text default null,
    p_similaridade_minima numeric default 0,
    p_lotes jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer
set search_path = pg_catalog
as $$
declare
    v_usuario uuid := auth.uid();
    v_pedido jsonb;
    v_anterior jsonb;
    v_lote record;
    v_grupo jsonb;
    v_lote_id bigint;
    v_matriculas text[];
    v_casos text[];
    v_total integer := 0;
    v_total_lotes integer := 0;
begin
    if not exists (select 1 from public.perfis where id=v_usuario and ativo and perfil='admin') then
        raise exception 'Acesso restrito ao administrador' using errcode='42501';
    end if;
    if p_operacao_id is null or p_snapshot_id is null then raise exception 'Operação ou prévia inválida'; end if;
    if nullif(btrim(p_nome),'') is null or length(btrim(p_nome)) > 100 then raise exception 'Nome da entrega inválido'; end if;
    if nullif(btrim(p_municipio),'') is null then raise exception 'Município inválido'; end if;
    if p_similaridade_minima is null or p_similaridade_minima < 0 or p_similaridade_minima > 100 then
        raise exception 'Similaridade inválida';
    end if;
    if jsonb_typeof(p_lotes) <> 'array' or jsonb_array_length(p_lotes)=0 then raise exception 'Divisão vazia'; end if;

    v_pedido := jsonb_build_object('snapshotId',p_snapshot_id,'nome',btrim(p_nome),
      'municipio',p_municipio,'tipo',p_tipo,'similaridadeMinima',p_similaridade_minima,'lotes',p_lotes);
    perform pg_advisory_xact_lock(hashtextextended('lote_operacao:'||p_operacao_id::text,0));
    select pedido into v_anterior from public.lote_operacoes where id=p_operacao_id and criado_por=v_usuario;
    if found then
        if v_anterior <> v_pedido then raise exception 'Identificador de operação já usado com outro conteúdo'; end if;
        return (select jsonb_build_object('operacaoId',p_operacao_id,'lotes',count(distinct id),'casos',count(lc.caso_id),'repetida',true)
          from public.lotes l left join public.lote_casos lc on lc.lote_id=l.id where l.operacao_id=p_operacao_id);
    end if;
    if exists(select 1 from public.lote_operacoes where id=p_operacao_id) then raise exception 'Identificador de operação indisponível'; end if;
    if not exists(select 1 from public.lote_snapshots where id=p_snapshot_id and criado_por=v_usuario and expira_em>statement_timestamp()) then
        raise exception 'Prévia expirada ou substituída. Gere novamente.';
    end if;
    if exists(select 1 from jsonb_to_recordset(p_lotes) as x("analistaId" uuid,grupos jsonb)
      group by x."analistaId" having count(*)>1) then raise exception 'Analista repetido na divisão'; end if;
    if exists(select 1 from jsonb_to_recordset(p_lotes) as x("analistaId" uuid,grupos jsonb)
      where x."analistaId" is null or jsonb_typeof(x.grupos)<>'array' or jsonb_array_length(x.grupos)=0
        or not exists(select 1 from public.perfis p where p.id=x."analistaId" and p.ativo and p.perfil='analista')) then
      raise exception 'Analista inválido, inativo ou sem grupos';
    end if;
    -- Nenhum caso ou matrícula pode aparecer duas vezes no pedido.
    if exists(with itens as (select jsonb_array_elements_text(g->'casoIds') id from jsonb_to_recordset(p_lotes) x("analistaId" uuid,grupos jsonb), lateral jsonb_array_elements(x.grupos) g)
      select 1 from itens group by id having count(*)>1) then raise exception 'Caso repetido na divisão'; end if;
    if exists(with itens as (select jsonb_array_elements_text(g->'matriculas') id from jsonb_to_recordset(p_lotes) x("analistaId" uuid,grupos jsonb), lateral jsonb_array_elements(x.grupos) g)
      select 1 from itens group by id having count(*)>1) then raise exception 'Matrícula repetida na divisão'; end if;

    -- Confere todo o pedido contra a cópia uma única vez. Fazer isto dentro do
    -- laço varreria as páginas novamente para cada grupo de um município grande.
    if exists(
      with linhas as materialized (
        select linha from public.lote_snapshot_paginas sp,
          lateral jsonb_array_elements(sp.casos) linha where sp.snapshot_id=p_snapshot_id
      ), itens as (
        select 'caso' tipo,jsonb_array_elements_text(g->'casoIds') valor
          from jsonb_to_recordset(p_lotes) x("analistaId" uuid,grupos jsonb),lateral jsonb_array_elements(x.grupos) g
        union all
        select 'matricula',jsonb_array_elements_text(g->'matriculas')
          from jsonb_to_recordset(p_lotes) x("analistaId" uuid,grupos jsonb),lateral jsonb_array_elements(x.grupos) g
      )
      select 1 from itens i where not exists(select 1 from linhas s where
        (i.tipo='caso' and s.linha->>0=i.valor) or
        (i.tipo='matricula' and (s.linha->>1=i.valor or s.linha->>2=i.valor)))
    ) then raise exception 'Grupo não pertence à prévia informada. Gere novamente.'; end if;

    insert into public.lote_operacoes(id,criado_por,pedido) values(p_operacao_id,v_usuario,v_pedido);
    for v_lote in select * from jsonb_to_recordset(p_lotes) as x("analistaId" uuid,grupos jsonb) loop
      insert into public.lotes(nome,municipio,tipo,similaridade_minima,analista_id,criado_por,estado,operacao_id)
      values(left(btrim(p_nome)||' · '||(select nome from public.perfis where id=v_lote."analistaId"),120),
        p_municipio,nullif(p_tipo,''),p_similaridade_minima,v_lote."analistaId",v_usuario,'ativo',p_operacao_id)
      returning id into v_lote_id;
      v_total_lotes := v_total_lotes+1;
      for v_grupo in select value from jsonb_array_elements(v_lote.grupos) loop
        if jsonb_typeof(v_grupo->'casoIds')<>'array' or jsonb_typeof(v_grupo->'matriculas')<>'array' then raise exception 'Grupo inválido'; end if;
        select array_agg(value order by value) into v_casos from jsonb_array_elements_text(v_grupo->'casoIds');
        select array_agg(value order by value) into v_matriculas from jsonb_array_elements_text(v_grupo->'matriculas');
        if coalesce(cardinality(v_casos),0)=0 or coalesce(cardinality(v_matriculas),0)<2
          or exists(select 1 from unnest(v_casos) x where nullif(btrim(x),'') is null)
          or exists(select 1 from unnest(v_matriculas) x where nullif(btrim(x),'') is null) then raise exception 'Grupo vazio ou inválido'; end if;
        -- Bloqueia todas as linhas atuais que tocam o componente enviado.
        perform 1 from public.casos c where c.ativo and (c.code_a=any(v_matriculas) or c.code_b=any(v_matriculas)) for update;
        -- Um novo elo fora da lista prova que a prévia ficou obsoleta.
        if exists(select 1 from public.casos c where c.ativo and (c.code_a=any(v_matriculas) or c.code_b=any(v_matriculas))
          and (not c.code_a=any(v_matriculas) or not c.code_b=any(v_matriculas))) then
          raise exception 'Relações mudaram desde a prévia. Gere novamente.';
        end if;
        if exists(select 1 from public.reservas r join public.casos c on c.caso_id=r.caso_id
          where c.ativo and (c.code_a=any(v_matriculas) or c.code_b=any(v_matriculas)) and r.expira_em>statement_timestamp()) then
          raise exception 'Um grupo possui reserva vigente. Gere novamente.';
        end if;
        if exists(select 1 from public.lote_matriculas lm where lm.code=any(v_matriculas))
          or exists(select 1 from public.lote_casos lc where lc.caso_id=any(v_casos)) then
          raise exception 'Um caso ou matrícula já foi atribuído. Gere novamente.';
        end if;
        -- O conjunto enviado deve ser exatamente o das pendências elegíveis desse grupo.
        if exists(select 1 from unnest(v_casos) id where not exists(
          select 1 from public.casos c where c.caso_id=id and c.ativo
            and (c.municipio_a=p_municipio or c.municipio_b=p_municipio)
            and (p_tipo is null or p_tipo='' or c.tipo=p_tipo) and c.similaridade>=p_similaridade_minima
            and not exists(select 1 from public.revisoes r where r.caso_id=c.caso_id)))
          or exists(select 1 from public.casos c where c.ativo and (c.code_a=any(v_matriculas) or c.code_b=any(v_matriculas))
            and not exists(select 1 from public.revisoes r where r.caso_id=c.caso_id)
            and ((c.municipio_a=p_municipio or c.municipio_b=p_municipio)
              and (p_tipo is null or p_tipo='' or c.tipo=p_tipo) and c.similaridade>=p_similaridade_minima)
            and not c.caso_id=any(v_casos)) then raise exception 'Casos elegíveis mudaram desde a prévia. Gere novamente.';
        end if;
        -- Qualquer pendência relacionada fora do recorte teria bloqueado o motor.
        if exists(select 1 from public.casos c where c.ativo and (c.code_a=any(v_matriculas) or c.code_b=any(v_matriculas))
          and not exists(select 1 from public.revisoes r where r.caso_id=c.caso_id)
          and not ((c.municipio_a=p_municipio or c.municipio_b=p_municipio)
            and (p_tipo is null or p_tipo='' or c.tipo=p_tipo) and c.similaridade>=p_similaridade_minima)) then
          raise exception 'Grupo possui pendência fora do recorte. Gere novamente.';
        end if;
        insert into public.lote_matriculas(code,lote_id) select unnest(v_matriculas),v_lote_id;
        insert into public.lote_casos(caso_id,lote_id) select unnest(v_casos),v_lote_id;
        insert into public.lote_eventos(operacao_id,caso_id,lote_destino_id,realizado_por)
          select p_operacao_id,unnest(v_casos),v_lote_id,v_usuario;
        v_total := v_total+cardinality(v_casos);
      end loop;
    end loop;
    return jsonb_build_object('operacaoId',p_operacao_id,'lotes',v_total_lotes,'casos',v_total,'repetida',false);
end;
$$;
revoke all on function public.confirmar_lotes_web(uuid,uuid,text,text,text,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.confirmar_lotes_web(uuid,uuid,text,text,text,numeric,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
