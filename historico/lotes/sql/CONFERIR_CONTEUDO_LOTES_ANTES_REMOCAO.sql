-- Somente leitura. Identifica o que impediu a limpeza da estrutura de lotes.
select 'lote_eventos' as tabela, count(*) as registros from public.lote_eventos
union all select 'lote_casos', count(*) from public.lote_casos
union all select 'lote_matriculas', count(*) from public.lote_matriculas
union all select 'lotes', count(*) from public.lotes
union all select 'lote_operacoes', count(*) from public.lote_operacoes
union all select 'lote_snapshot_paginas', count(*) from public.lote_snapshot_paginas
union all select 'lote_snapshots', count(*) from public.lote_snapshots
order by tabela;

-- Metadados do cache temporario, sem retornar os casos armazenados nas paginas.
select id, criado_por, criado_em, expira_em, total, paginas
from public.lote_snapshots
order by criado_em desc;

-- Operacoes/lotes permanentes precisam ser investigados antes de qualquer exclusao.
select id, criado_por, criado_em
from public.lote_operacoes
order by criado_em desc;

select id, nome, municipio, tipo, similaridade_minima, analista_id,
       criado_por, estado, operacao_id, criado_em
from public.lotes
order by criado_em desc;
