-- Auditoria somente leitura: este arquivo nao altera nem remove nada.
-- Verifica se public.usuarios e public.sincronizacoes ainda possuem dados ou dependencias.

select 'registros' as categoria,
       'public.usuarios' as objeto,
       count(*)::text as detalhe
  from public.usuarios
union all
select 'registros', 'public.sincronizacoes', count(*)::text
  from public.sincronizacoes
union all
select 'tamanho', 'public.usuarios',
       pg_size_pretty(pg_total_relation_size('public.usuarios'))
union all
select 'tamanho', 'public.sincronizacoes',
       pg_size_pretty(pg_total_relation_size('public.sincronizacoes'))
union all
select 'chave estrangeira',
       c.conrelid::regclass::text,
       c.conname || ' -> ' || c.confrelid::regclass::text
  from pg_constraint c
 where c.contype = 'f'
   and (
       c.conrelid in ('public.usuarios'::regclass, 'public.sincronizacoes'::regclass)
       or c.confrelid in ('public.usuarios'::regclass, 'public.sincronizacoes'::regclass)
   )
union all
select 'funcao',
       n.nspname || '.' || p.proname,
       'menciona tabela legada no codigo'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname not in ('pg_catalog', 'information_schema')
   and (
       p.prosrc ilike '%public.usuarios%'
       or p.prosrc ilike '%public.sincronizacoes%'
       or p.prosrc ~* '(^|[^a-z_])(usuarios|sincronizacoes)([^a-z_]|$)'
   )
union all
select 'view',
       v.view_schema || '.' || v.view_name,
       'usa ' || v.table_schema || '.' || v.table_name
  from information_schema.view_table_usage v
 where v.table_schema = 'public'
   and v.table_name in ('usuarios', 'sincronizacoes')
order by categoria, objeto;
