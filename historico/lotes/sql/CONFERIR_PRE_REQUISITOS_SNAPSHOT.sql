-- Somente leitura: retorna 10 linhas de estrutura, sem registros ou credenciais.
-- Executar no SQL Editor e exportar o resultado em CSV.
with esperadas(tabela) as (
    values ('perfis'), ('casos'), ('revisoes'), ('reservas'),
           ('lotes'), ('lote_casos'), ('lote_matriculas'), ('lote_eventos'),
           ('lote_snapshots'), ('lote_snapshot_paginas')
)
select e.tabela,
    c.oid is not null as existe,
    c.relrowsecurity as rls,
    c.reltuples::bigint as linhas_estimadas,
    (select jsonb_agg(jsonb_build_object(
        'coluna', a.attname,
        'tipo', pg_catalog.format_type(a.atttypid, a.atttypmod),
        'obrigatoria', a.attnotnull
    ) order by a.attnum)
     from pg_catalog.pg_attribute a
     where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as colunas,
    (select jsonb_agg(pg_catalog.pg_get_indexdef(i.indexrelid))
     from pg_catalog.pg_index i where i.indrelid = c.oid) as indices,
    (select jsonb_agg(pg_catalog.pg_get_constraintdef(k.oid))
     from pg_catalog.pg_constraint k where k.conrelid = c.oid) as restricoes,
    has_table_privilege('authenticated', c.oid, 'SELECT') as leitura_app,
    has_table_privilege('authenticated', c.oid, 'INSERT') as insercao_app
from esperadas e
left join pg_catalog.pg_namespace n on n.nspname = 'public'
left join pg_catalog.pg_class c on c.relnamespace = n.oid and c.relname = e.tabela
order by e.tabela;
