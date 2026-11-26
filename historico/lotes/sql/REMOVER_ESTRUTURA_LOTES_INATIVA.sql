-- Remove somente a estrutura de lotes abandonada.
-- Protecoes:
-- 1. interrompe se qualquer tabela permanente contiver registros;
--    snapshots sao apenas cache temporario e serao apagados;
-- 2. nao usa CASCADE;
-- 3. toda a operacao ocorre em uma unica transacao.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
    if exists (select 1 from public.lote_eventos)
       or exists (select 1 from public.lote_casos)
       or exists (select 1 from public.lote_matriculas)
       or exists (select 1 from public.lotes)
       or exists (select 1 from public.lote_operacoes) then
        raise exception 'Limpeza cancelada: existem lotes, operações ou vínculos permanentes.';
    end if;
end;
$$;

-- Cache consultivo expirado ou abandonado. O ON DELETE CASCADE remove as paginas.
delete from public.lote_snapshots;

drop function if exists public.listar_meus_lotes_web();
drop function if exists public.confirmar_lotes_web(uuid,uuid,text,text,text,numeric,jsonb);
drop function if exists public.ler_snapshot_lotes_web(uuid,integer);
drop function if exists public.criar_snapshot_lotes_web();

-- Tabelas filhas primeiro, para respeitar todas as chaves estrangeiras.
drop table public.lote_eventos;
drop table public.lote_casos;
drop table public.lote_matriculas;
drop table public.lotes;
drop table public.lote_operacoes;
drop table public.lote_snapshot_paginas;
drop table public.lote_snapshots;

notify pgrst, 'reload schema';
commit;

-- Resultado esperado: as sete colunas abaixo devem retornar NULL.
select
    to_regclass('public.lote_eventos') as lote_eventos,
    to_regclass('public.lote_casos') as lote_casos,
    to_regclass('public.lote_matriculas') as lote_matriculas,
    to_regclass('public.lotes') as lotes,
    to_regclass('public.lote_operacoes') as lote_operacoes,
    to_regclass('public.lote_snapshot_paginas') as lote_snapshot_paginas,
    to_regclass('public.lote_snapshots') as lote_snapshots;
