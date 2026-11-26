-- PREPARADO, NÃO APLICADO. Requer LOTES_01, LOTES_02 e LOTES_03.
-- Ativa a precedência lote/distribuição legada na autorização e na fila.
-- Aplicar apenas depois do piloto das RPCs anteriores.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create or replace function public.usuario_pode_acessar_caso_web(p_usuario_id uuid,p_caso_id text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.perfis p join public.casos c on c.caso_id=p_caso_id and c.ativo
    where p.id=p_usuario_id and p.ativo and (
      p.perfil='admin'
      or exists(select 1 from public.lote_casos lc join public.lotes l on l.id=lc.lote_id
        where lc.caso_id=c.caso_id and l.analista_id=p.id and l.estado='ativo')
      or (
        not exists(select 1 from public.lote_casos lc where lc.caso_id=c.caso_id)
        and not exists(select 1 from public.lote_matriculas lm where lm.code=c.code_a or lm.code=c.code_b)
        -- Ao entrar no piloto deste recorte, o analista deixa de receber casos
        -- extras pela regra antiga do mesmo município/tipo.
        and not exists(select 1 from public.lotes lp where lp.analista_id=p.id and lp.estado='ativo'
          and (lp.municipio=c.municipio_a or lp.municipio=c.municipio_b)
          and (lp.tipo is null or lp.tipo=c.tipo) and c.similaridade>=lp.similaridade_minima)
        and exists(select 1 from public.distribuicoes d where d.analista_id=p.id and d.ativo
          and (d.municipio is null or d.municipio=c.municipio_a or d.municipio=c.municipio_b)
          and (d.tipo is null or d.tipo=c.tipo) and c.similaridade>=d.similaridade_minima)
      )
    ));
$$;

create or replace function public.casos_autorizados_web()
returns table(caso_id text) language sql stable security definer set search_path=public as $$
  select c.caso_id from public.casos c
  where public.usuario_pode_acessar_caso_web(auth.uid(),c.caso_id);
$$;
-- Mantém na sequência os desmembramentos relacionados à mesma matrícula A.

create index if not exists idx_casos_grupo_matricula_ativos
    on public.casos (code_a, similaridade desc nulls last, code_b, caso_id)
    where ativo;

create or replace function public.buscar_fila_web(
    p_situacao text default 'Pendente', p_tipo text default null,
    p_municipio text default null, p_similaridade_minima numeric default 0,
    p_limite integer default 15, p_offset integer default 0
)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare v_resultado jsonb; v_perfil text;
begin
    select p.perfil into v_perfil from public.perfis p where p.id = auth.uid() and p.ativo;
    if v_perfil is null then raise exception 'Usuário sem perfil ativo'; end if;
    if coalesce(p_similaridade_minima, 0) < 0 or coalesce(p_similaridade_minima, 0) > 100 then
        raise exception 'Similaridade deve estar entre 0 e 100';
    end if;

    with selecionados as materialized (
        select c.caso_id, c.code_a, c.code_b, c.tipo, c.status_origem,
               c.similaridade, c.detalhe, c.versao_base, c.municipio_a, c.municipio_b,
               r.decisao, r.observacao, r.revisor_nome, r.revisado_em,
               q.revisor_nome reserva_revisor, q.sessao_id reserva_sessao, q.expira_em,
               case when r.caso_id is not null then 'Concluído'
                    when q.caso_id is not null then 'Em análise' else 'Pendente' end situacao
          from public.casos c
          left join public.revisoes r on r.caso_id = c.caso_id
          left join public.reservas q on q.caso_id = c.caso_id and q.expira_em > now()
         where c.ativo and c.similaridade >= coalesce(p_similaridade_minima, 0)
           and public.usuario_pode_acessar_caso_web(auth.uid(), c.caso_id)
           and (p_tipo is null or c.tipo = p_tipo)
           and (p_municipio is null or c.municipio_a = p_municipio or c.municipio_b = p_municipio)
           and (p_situacao = 'Todos'
                or (p_situacao = 'Concluído' and r.caso_id is not null)
                or (p_situacao = 'Em análise' and r.caso_id is null and q.caso_id is not null)
                or (p_situacao = 'Pendente' and r.caso_id is null and q.caso_id is null))
         order by c.code_a, c.similaridade desc nulls last, c.code_b, c.caso_id
         limit least(greatest(p_limite, 1), 100) offset greatest(p_offset, 0)
    ), completos as (
        select s.*,
               ma.foto foto_a, ma.origem_foto origem_foto_a, ma.backoffice backoffice_a,
               ma.agente agente_a, ma.data_registro data_a, ma.endereco endereco_a,
               ma.situacao_backoffice situacao_backoffice_a,
               mb.foto foto_b, mb.origem_foto origem_foto_b, mb.backoffice backoffice_b,
               mb.agente agente_b, mb.data_registro data_b, mb.endereco endereco_b,
               mb.situacao_backoffice situacao_backoffice_b
          from selecionados s
          join public.matriculas ma on ma.code = s.code_a
          join public.matriculas mb on mb.code = s.code_b
         order by s.code_a, s.similaridade desc nulls last, s.code_b, s.caso_id
    )
    select coalesce(jsonb_agg(to_jsonb(completos)), '[]'::jsonb) into v_resultado from completos;
    return v_resultado;
end;
$$;

revoke all on function public.buscar_fila_web(text, text, text, numeric, integer, integer) from public;
grant execute on function public.buscar_fila_web(text, text, text, numeric, integer, integer) to authenticated;

create or replace function public.resumo_fila_web()
returns jsonb language plpgsql stable security definer set search_path=public
set statement_timeout='20s' as $$
declare v_resultado jsonb;
begin
  if not exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo) then raise exception 'Usuário sem perfil ativo'; end if;
  select jsonb_build_object('total',count(*),
    'pendentes',count(*) filter(where r.caso_id is null and q.caso_id is null),
    'em_analise',count(*) filter(where r.caso_id is null and q.caso_id is not null),
    'concluidos',count(*) filter(where r.caso_id is not null)) into v_resultado
  from public.casos c
  left join public.revisoes r on r.caso_id=c.caso_id
  left join public.reservas q on q.caso_id=c.caso_id and q.expira_em>statement_timestamp()
  where public.usuario_pode_acessar_caso_web(auth.uid(),c.caso_id);
  return v_resultado;
end; $$;

create or replace function public.contar_fila_filtrada_web(
  p_situacao text default 'Pendente',p_tipo text default null,
  p_municipio text default null,p_similaridade_minima numeric default 0)
returns bigint language plpgsql stable security definer set search_path=public
set statement_timeout='20s' as $$
declare v_total bigint;
begin
  if not exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo) then raise exception 'Usuário sem perfil ativo'; end if;
  if coalesce(p_similaridade_minima,0)<0 or coalesce(p_similaridade_minima,0)>100 then raise exception 'Similaridade deve estar entre 0 e 100'; end if;
  select count(*) into v_total from public.casos c
  left join public.revisoes r on r.caso_id=c.caso_id
  left join public.reservas q on q.caso_id=c.caso_id and q.expira_em>statement_timestamp()
  where public.usuario_pode_acessar_caso_web(auth.uid(),c.caso_id)
    and c.similaridade>=coalesce(p_similaridade_minima,0)
    and (p_tipo is null or c.tipo=p_tipo)
    and (p_municipio is null or c.municipio_a=p_municipio or c.municipio_b=p_municipio)
    and (p_situacao='Todos' or (p_situacao='Concluído' and r.caso_id is not null)
      or (p_situacao='Em análise' and r.caso_id is null and q.caso_id is not null)
      or (p_situacao='Pendente' and r.caso_id is null and q.caso_id is null));
  return v_total;
end; $$;

create or replace function public.listar_meus_lotes_web()
returns table(id bigint,nome text,municipio text,tipo text,estado text,total bigint,
  concluidos bigint,em_analise bigint,pendentes bigint)
language plpgsql stable security definer set search_path=public as $$
begin
  if not exists(select 1 from public.perfis p where p.id=auth.uid() and p.ativo) then raise exception 'Usuário sem perfil ativo'; end if;
  return query select l.id,l.nome,l.municipio,l.tipo,l.estado,count(lc.caso_id),
    count(lc.caso_id) filter(where r.caso_id is not null),
    count(lc.caso_id) filter(where r.caso_id is null and q.caso_id is not null),
    count(lc.caso_id) filter(where r.caso_id is null and q.caso_id is null and c.ativo)
  from public.lotes l join public.lote_casos lc on lc.lote_id=l.id
  join public.casos c on c.caso_id=lc.caso_id
  left join public.revisoes r on r.caso_id=lc.caso_id
  left join public.reservas q on q.caso_id=lc.caso_id and q.expira_em>statement_timestamp()
  where l.analista_id=auth.uid() and l.estado in('ativo','pausado')
  group by l.id,l.nome,l.municipio,l.tipo,l.estado order by l.criado_em desc;
end; $$;

revoke all on function public.usuario_pode_acessar_caso_web(uuid,text) from public,anon,authenticated;
revoke all on function public.casos_autorizados_web() from public,anon,authenticated;
revoke all on function public.resumo_fila_web() from public,anon,authenticated;
revoke all on function public.contar_fila_filtrada_web(text,text,text,numeric) from public,anon,authenticated;
revoke all on function public.listar_meus_lotes_web() from public,anon,authenticated;
grant execute on function public.casos_autorizados_web() to authenticated;
grant execute on function public.resumo_fila_web() to authenticated;
grant execute on function public.contar_fila_filtrada_web(text,text,text,numeric) to authenticated;
grant execute on function public.listar_meus_lotes_web() to authenticated;

analyze public.casos;
notify pgrst,'reload schema';
commit;
