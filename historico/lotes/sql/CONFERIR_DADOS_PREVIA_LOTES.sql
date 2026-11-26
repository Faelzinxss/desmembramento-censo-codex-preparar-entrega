-- Somente leitura. Contagens exatas, sem dados pessoais.
-- A similaridade pode ser nula no schema real, mas o motor exige número finito.
select
    count(*) as casos_totais,
    count(*) filter (where ativo) as casos_ativos,
    count(*) filter (where ativo and similaridade is null) as ativos_sem_similaridade,
    count(*) filter (where ativo and (
        similaridade < 0 or similaridade > 100
        or similaridade = 'NaN'::real
    )) as ativos_similaridade_invalida,
    count(*) filter (where ativo and (
        btrim(caso_id) = '' or btrim(code_a) = '' or btrim(code_b) = ''
    )) as ativos_identificacao_vazia,
    (select count(*) from public.reservas where expira_em > statement_timestamp()) as reservas_vigentes,
    (select count(*) from public.lotes) as lotes_existentes,
    (select count(*) from public.lote_casos) as vinculos_casos,
    (select count(*) from public.lote_matriculas) as vinculos_matriculas
from public.casos;
