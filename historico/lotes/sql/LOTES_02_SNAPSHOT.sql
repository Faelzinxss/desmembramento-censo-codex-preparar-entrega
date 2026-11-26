-- PREPARADO, NÃO APLICADO. Requer LOTES_01 já aplicada; não a repetir.
-- Fazer backup e validar em banco separado antes de executar inteiro.
-- Não ativa lotes nem altera funções, permissões ou distribuições existentes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.lote_snapshots (
    id uuid primary key default gen_random_uuid(),
    criado_por uuid not null references public.perfis(id),
    criado_em timestamptz not null default statement_timestamp(),
    expira_em timestamptz not null default statement_timestamp() + interval '20 minutes',
    total integer not null default 0 check (total >= 0),
    paginas integer not null default 0 check (paginas >= 0),
    unique (criado_por)
);
create table public.lote_snapshot_paginas (
    snapshot_id uuid not null references public.lote_snapshots(id) on delete cascade,
    pagina integer not null check (pagina >= 0),
    casos jsonb not null check (jsonb_typeof(casos) = 'array'),
    primary key (snapshot_id, pagina)
);
alter table public.lote_snapshots enable row level security;
alter table public.lote_snapshot_paginas enable row level security;
revoke all on public.lote_snapshots, public.lote_snapshot_paginas from public, anon, authenticated;

create function public.criar_snapshot_lotes_web()
returns jsonb language plpgsql security definer
set search_path = pg_catalog
as $$
declare
    v_usuario uuid := auth.uid();
    v_snapshot public.lote_snapshots%rowtype;
    v_total integer;
    v_paginas integer;
begin
    if not exists (select 1 from public.perfis where id = v_usuario and ativo and perfil = 'admin') then
        raise exception 'Acesso restrito ao administrador' using errcode = '42501';
    end if;
    -- Serializa criações do mesmo administrador. Outra prévia invalida a anterior.
    perform pg_advisory_xact_lock(hashtextextended('lote_snapshot:' || v_usuario::text, 0));
    -- Exclusão somente do cache temporário, nunca dos casos ou dos lotes.
    delete from public.lote_snapshots where criado_por = v_usuario or expira_em <= statement_timestamp();
    insert into public.lote_snapshots (criado_por) values (v_usuario) returning * into v_snapshot;

    -- UMA instrução lê todos os estados operacionais no mesmo snapshot MVCC.
    -- Não filtrar por município: relações externas precisam bloquear o grupo.
    with fatos as (
        select c.caso_id,
            -- Contrato v2: dez posições fixas, documentadas em formatoSnapshot.js.
            -- ativo é sempre true pelo WHERE; nenhum vínculo é descartado.
            jsonb_build_array(
                c.caso_id, c.code_a, c.code_b, c.municipio_a, c.municipio_b,
                c.tipo, c.similaridade,
                exists (select 1 from public.revisoes r where r.caso_id = c.caso_id),
                exists (select 1 from public.reservas r where r.caso_id = c.caso_id and r.expira_em > statement_timestamp()),
                -- Conservador: qualquer vínculo corrente bloqueia, mesmo encerrado.
                -- Inclui propriedade de matrícula cujo caso original está inativo.
                exists (select 1 from public.lote_casos lc where lc.caso_id = c.caso_id)
                    or exists (select 1 from public.lote_matriculas lm where lm.code = c.code_a or lm.code = c.code_b)
            ) as dado,
            ((row_number() over (order by c.caso_id collate "C") - 1) / 5000)::integer as pagina
        from public.casos c where c.ativo
    ), gravadas as (
        insert into public.lote_snapshot_paginas (snapshot_id, pagina, casos)
        select v_snapshot.id, pagina, jsonb_agg(dado order by caso_id collate "C")
        from fatos group by pagina
        returning jsonb_array_length(casos) as quantidade
    )
    select coalesce(sum(quantidade), 0)::integer, count(*)::integer into v_total, v_paginas from gravadas;

    update public.lote_snapshots set total = v_total, paginas = v_paginas where id = v_snapshot.id;
    return jsonb_build_object('snapshotId', v_snapshot.id, 'total', v_total, 'paginas', v_paginas,
        'tamanhoPagina', 5000, 'expiraEm', v_snapshot.expira_em, 'versao', 2);
end;
$$;

create function public.ler_snapshot_lotes_web(p_snapshot_id uuid, p_pagina integer)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog
as $$
declare
    v_snapshot public.lote_snapshots%rowtype;
    v_casos jsonb;
begin
    if not exists (select 1 from public.perfis where id = auth.uid() and ativo and perfil = 'admin') then
        raise exception 'Acesso restrito ao administrador' using errcode = '42501';
    end if;
    select * into v_snapshot from public.lote_snapshots
    where id = p_snapshot_id and criado_por = auth.uid() and expira_em > statement_timestamp();
    if not found then raise exception 'Prévia expirada ou substituída. Gere novamente.'; end if;
    if p_pagina is null or p_pagina < 0 or p_pagina >= v_snapshot.paginas then
        raise exception 'Página inválida';
    end if;
    select casos into strict v_casos from public.lote_snapshot_paginas
    where snapshot_id = p_snapshot_id and pagina = p_pagina;
    return jsonb_build_object('snapshotId', v_snapshot.id, 'pagina', p_pagina,
        'total', v_snapshot.total, 'paginas', v_snapshot.paginas, 'casos', v_casos, 'versao', 2);
end;
$$;

revoke all on function public.criar_snapshot_lotes_web() from public, anon, authenticated;
revoke all on function public.ler_snapshot_lotes_web(uuid, integer) from public, anon, authenticated;
grant execute on function public.criar_snapshot_lotes_web() to authenticated;
grant execute on function public.ler_snapshot_lotes_web(uuid, integer) to authenticated;
comment on table public.lote_snapshots is 'Cache de prévia, 20 minutos, um por administrador. Não autoriza confirmação. Expirados removidos na próxima criação.';
notify pgrst, 'reload schema';
commit;
