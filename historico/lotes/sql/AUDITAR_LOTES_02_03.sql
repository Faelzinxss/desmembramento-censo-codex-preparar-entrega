-- Auditoria somente de leitura para executar depois de LOTES_02_SNAPSHOT.sql
-- e LOTES_03_CONFIRMAR.sql. Nenhuma linha e alterada.

select
  c.relname as tabela,
  c.relrowsecurity as rls_ativo,
  has_table_privilege('anon', format('public.%I', c.relname), 'select') as anon_pode_ler,
  has_table_privilege('authenticated', format('public.%I', c.relname), 'select') as autenticado_pode_ler
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('lote_snapshots', 'lote_snapshot_paginas', 'lote_operacoes')
  and c.relkind = 'r'
order by c.relname;

select
  p.proname as funcao,
  pg_get_function_identity_arguments(p.oid) as argumentos,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'execute') as anon_pode_executar,
  has_function_privilege('authenticated', p.oid, 'execute') as autenticado_pode_executar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'criar_snapshot_lotes_web',
    'ler_snapshot_lotes_web',
    'confirmar_lotes_web'
  )
order by p.proname;

select
  conname as restricao,
  conrelid::regclass as tabela,
  confrelid::regclass as referencia
from pg_constraint
where conname = 'lotes_operacao_fk';

select
  (select count(*) from public.lote_snapshots) as snapshots,
  (select count(*) from public.lote_snapshot_paginas) as paginas_snapshot,
  (select count(*) from public.lote_operacoes) as operacoes,
  (select count(*) from public.lotes) as lotes,
  (select count(*) from public.lote_casos) as vinculos_casos,
  (select count(*) from public.lote_matriculas) as vinculos_matriculas;
