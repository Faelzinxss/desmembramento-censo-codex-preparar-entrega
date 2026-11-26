-- Etapa 1: estrutura INATIVA. Não cria lotes, não modifica a fila ou os dados atuais.
-- Fazer backup antes. Executar uma única vez, inteiro, no SQL Editor.
-- RLS sem políticas + REVOKE: navegador não pode ler nem escrever estas tabelas.
-- As próximas etapas adicionarão RPCs e permissões após testes de concorrência.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Sem IF NOT EXISTS: interrompe e reverte tudo se houver objetos homônimos,
-- evitando aceitar silenciosamente uma estrutura diferente.
create table public.lotes (
    id bigint generated always as identity primary key,
    nome text not null check (length(trim(nome)) between 1 and 120),
    municipio text not null check (length(trim(municipio)) > 0),
    tipo text,
    similaridade_minima numeric not null default 0
        check (similaridade_minima between 0 and 100),
    analista_id uuid not null references public.perfis(id),
    criado_por uuid not null references public.perfis(id),
    estado text not null default 'rascunho'
        check (estado in ('rascunho', 'ativo', 'pausado', 'encerrado')),
    operacao_id uuid not null,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    unique (operacao_id, analista_id)
);

-- Um caso tem uma associação corrente. Transferências futuras deverão registrar
-- o movimento e atualizar este vínculo na mesma transação, sem apagar revisões.
create table public.lote_casos (
    caso_id text primary key references public.casos(caso_id),
    lote_id bigint not null references public.lotes(id),
    atribuido_em timestamptz not null default now()
);
create index idx_lote_casos_lote on public.lote_casos(lote_id);

-- Uma matrícula fica vinculada a apenas um lote operacional.
-- Esta constraint sozinha NÃO valida componentes conectados: a confirmação
-- transacional ainda será implementada. Não preencher manualmente.
create table public.lote_matriculas (
    code text primary key references public.matriculas(code),
    lote_id bigint not null references public.lotes(id),
    atribuido_em timestamptz not null default now()
);
create index idx_lote_matriculas_lote on public.lote_matriculas(lote_id);

-- Histórico enxuto por caso para reconstruir transferências e responsabilidade.
-- Não copia fotos, payload de matrícula nem conteúdo de avaliações.
create table public.lote_eventos (
    id bigint generated always as identity primary key,
    operacao_id uuid not null,
    caso_id text not null references public.casos(caso_id),
    lote_origem_id bigint references public.lotes(id),
    lote_destino_id bigint not null references public.lotes(id),
    realizado_por uuid not null references public.perfis(id),
    realizado_em timestamptz not null default now(),
    check (lote_origem_id is distinct from lote_destino_id),
    unique (operacao_id, caso_id)
);
create index idx_lote_eventos_caso on public.lote_eventos(caso_id);
create index idx_lotes_analista_estado on public.lotes(analista_id, estado);

alter table public.lotes enable row level security;
alter table public.lote_casos enable row level security;
alter table public.lote_matriculas enable row level security;
alter table public.lote_eventos enable row level security;
revoke all on table public.lotes, public.lote_casos, public.lote_matriculas,
    public.lote_eventos from public, anon, authenticated;
revoke all on sequence public.lotes_id_seq, public.lote_eventos_id_seq
    from public, anon, authenticated;

comment on table public.lotes is 'Estrutura de lotes; recurso ainda não ativado. Não preencher manualmente.';
commit;

-- Resultado esperado: quatro tabelas vazias, RLS habilitada e acesso falso.
select c.relname as tabela, c.relrowsecurity as rls_habilitada,
       has_table_privilege('authenticated', c.oid, 'SELECT') as leitura_app,
       has_table_privilege('authenticated', c.oid, 'INSERT') as escrita_app
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('lotes', 'lote_casos', 'lote_matriculas', 'lote_eventos')
order by c.relname;
