-- Restaura exatamente as funções exportadas antes da ativação dos lotes.

-- Gerado do CSV enviado em 07/09/2026. Não apaga lotes ou avaliações.

begin;

CREATE OR REPLACE FUNCTION public.usuario_pode_acessar_caso_web(p_usuario_id uuid, p_caso_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select exists (
        select 1
          from public.perfis p
          join public.casos c on c.caso_id = p_caso_id and c.ativo
         where p.id = p_usuario_id and p.ativo
           and (
               p.perfil = 'admin'
               or exists (
                   select 1
                     from public.distribuicoes d
                    where d.analista_id = p.id and d.ativo
                      and (d.municipio is null or d.municipio = c.municipio_a or d.municipio = c.municipio_b)
                      and (d.tipo is null or d.tipo = c.tipo)
                      and c.similaridade >= d.similaridade_minima
               )
           )
    );
$function$

;

CREATE OR REPLACE FUNCTION public.casos_autorizados_web()
 RETURNS TABLE(caso_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select c.caso_id
      from public.casos c
      join public.perfis p on p.id = auth.uid() and p.ativo
     where c.ativo
       and (
            p.perfil = 'admin'
            or exists (
                select 1 from public.distribuicoes d
                 where d.analista_id = p.id and d.ativo
                   and (d.municipio is null or d.municipio = c.municipio_a or d.municipio = c.municipio_b)
                   and (d.tipo is null or d.tipo = c.tipo)
                   and c.similaridade >= d.similaridade_minima
            )
       );
$function$

;

CREATE OR REPLACE FUNCTION public.buscar_fila_web(p_situacao text DEFAULT 'Pendente'::text, p_tipo text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_similaridade_minima numeric DEFAULT 0, p_limite integer DEFAULT 15, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
           and (v_perfil = 'admin' or exists (
               select 1 from public.distribuicoes d
                where d.analista_id = auth.uid() and d.ativo
                  and (d.municipio is null or d.municipio = c.municipio_a or d.municipio = c.municipio_b)
                  and (d.tipo is null or d.tipo = c.tipo)
                  and c.similaridade >= d.similaridade_minima
           ))
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
$function$

;

CREATE OR REPLACE FUNCTION public.resumo_fila_web()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_total bigint; v_concluidos bigint; v_em_analise bigint;
begin
    if not exists (select 1 from public.perfis p where p.id = auth.uid() and p.ativo) then
        raise exception 'Usuário sem perfil ativo';
    end if;

    select count(*) into v_total from public.casos c where c.ativo;
    select count(*) into v_concluidos
      from public.revisoes r join public.casos c on c.caso_id = r.caso_id
     where c.ativo;
    select count(*) into v_em_analise
      from public.reservas q join public.casos c on c.caso_id = q.caso_id
     where c.ativo and q.expira_em > now()
       and not exists (select 1 from public.revisoes r where r.caso_id = q.caso_id);

    return jsonb_build_object(
        'total', v_total,
        'pendentes', greatest(v_total - v_concluidos - v_em_analise, 0),
        'em_analise', v_em_analise,
        'concluidos', v_concluidos
    );
end;
$function$

;

CREATE OR REPLACE FUNCTION public.contar_fila_filtrada_web(p_situacao text DEFAULT 'Pendente'::text, p_tipo text DEFAULT NULL::text, p_municipio text DEFAULT NULL::text, p_similaridade_minima numeric DEFAULT 0)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '20s'
AS $function$
declare v_total bigint; v_perfil text;
begin
    select p.perfil into v_perfil from public.perfis p where p.id = auth.uid() and p.ativo;
    if v_perfil is null then raise exception 'Usuário sem perfil ativo'; end if;

    if p_situacao = 'Concluído' then
        select count(*) into v_total
          from public.revisoes r join public.casos c on c.caso_id = r.caso_id
         where c.ativo and c.similaridade >= coalesce(p_similaridade_minima, 0)
           and (p_tipo is null or c.tipo = p_tipo)
           and (p_municipio is null or c.municipio_a = p_municipio or c.municipio_b = p_municipio);
    elsif p_situacao = 'Em análise' then
        select count(*) into v_total
          from public.reservas q join public.casos c on c.caso_id = q.caso_id
         where c.ativo and q.expira_em > now()
           and not exists (select 1 from public.revisoes r where r.caso_id = q.caso_id)
           and c.similaridade >= coalesce(p_similaridade_minima, 0)
           and (p_tipo is null or c.tipo = p_tipo)
           and (p_municipio is null or c.municipio_a = p_municipio or c.municipio_b = p_municipio);
    else
        select count(*) into v_total
          from public.casos c
         where c.ativo and c.similaridade >= coalesce(p_similaridade_minima, 0)
           and (p_tipo is null or c.tipo = p_tipo)
           and (p_municipio is null or c.municipio_a = p_municipio or c.municipio_b = p_municipio)
           and (p_situacao = 'Todos' or (
               not exists (select 1 from public.revisoes r where r.caso_id = c.caso_id)
               and not exists (select 1 from public.reservas q where q.caso_id = c.caso_id and q.expira_em > now())
           ));
    end if;
    return v_total;
end;
$function$

;

grant execute on function public.casos_autorizados_web() to authenticated;

grant execute on function public.buscar_fila_web(text,text,text,numeric,integer,integer) to authenticated;

grant execute on function public.resumo_fila_web() to authenticated;

grant execute on function public.contar_fila_filtrada_web(text,text,text,numeric) to authenticated;

commit;

notify pgrst,'reload schema';