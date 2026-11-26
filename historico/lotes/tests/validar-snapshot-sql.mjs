// Banco efêmero PGlite, sem conexão com Supabase ou credenciais reais.
// Instalar @electric-sql/pglite em uma pasta externa e informar PGLITE_MODULE
// com o caminho absoluto para dist/index.js. Não é teste de concorrência real.
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { gerarPrevia } from '../src/lotes/gerarPrevia.js'
import { decodificarCaso } from '../src/lotes/formatoSnapshot.js'
import { carregarSnapshot } from '../src/lotes/carregarSnapshot.js'

if (!process.env.PGLITE_MODULE) throw new Error('Informe PGLITE_MODULE (dist/index.js do PGlite).')
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const db = new PGlite()
const admin = '00000000-0000-0000-0000-000000000001'
const outro = '00000000-0000-0000-0000-000000000002'
const analista = '00000000-0000-0000-0000-000000000003'
const gestor = '00000000-0000-0000-0000-000000000004'
const inativo = '00000000-0000-0000-0000-000000000005'
const analista2 = '00000000-0000-0000-0000-000000000006'
const query = (sql, params = []) => db.query(sql, params)
const login = async (id, role = 'authenticated') => {
  await db.exec('reset role')
  await query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  assert.ok(['authenticated', 'anon'].includes(role))
  await db.exec(`set role ${role}`)
}
const criar = async () => (await query('select public.criar_snapshot_lotes_web() as resultado')).rows[0].resultado
let bytesTransmitidos = 0
const lerBruto = async (id, pagina) => (await query('select public.ler_snapshot_lotes_web($1::uuid, $2::integer) as resultado', [id, pagina])).rows[0].resultado
const ler = async (id, pagina) => {
  const data = await lerBruto(id, pagina)
  bytesTransmitidos += Buffer.byteLength(JSON.stringify(data))
  return { ...data, casos: data.casos.map(c=>decodificarCaso(c,data.versao)) }
}
let verificacoes = 0
const verificar = async (nome, fn) => { await fn(); verificacoes++; console.log(`OK: ${nome}`) }
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    create table public.perfis(id uuid primary key, nome text not null, perfil text not null, ativo boolean not null);
    create table public.matriculas(code text primary key,foto text,origem_foto text,backoffice text,
      agente text,data_registro timestamptz,endereco text,situacao_backoffice text);
    create table public.casos(caso_id text primary key, code_a text not null, code_b text not null,
      ativo boolean not null, municipio_a text, municipio_b text, tipo text not null, similaridade real,
      status_origem text,detalhe text,versao_base text not null default '1');
    create table public.revisoes(caso_id text primary key,decisao text,observacao text,revisor_nome text,revisado_em timestamptz);
    create table public.reservas(caso_id text primary key, expira_em timestamptz not null,
      revisor_nome text,sessao_id text,usuario_id uuid);
    create table public.distribuicoes(id bigint generated always as identity primary key,analista_id uuid,
      municipio text,tipo text,similaridade_minima numeric not null default 0,ativo boolean not null default true);
    alter table perfis enable row level security;
    alter table casos enable row level security;
    alter table revisoes enable row level security;
    alter table reservas enable row level security;
  `)
  for (const [id, perfil, ativo] of [[admin,'admin',true], [outro,'admin',true], [analista,'analista',true], [analista2,'analista',true], [gestor,'gestor',true], [inativo,'admin',false]]) {
    await query('insert into perfis values($1,$2,$3,$4)', [id, `Pessoa ${perfil}`, perfil, ativo])
  }
  await verificar('migrações originais executam sem alteração', async () => {
    for (const nome of ['LOTES_01_ESTRUTURA.sql', 'LOTES_02_SNAPSHOT.sql', 'LOTES_03_CONFIRMAR.sql', 'LOTES_04_ATIVAR_FILA.sql']) {
      await db.exec(await readFile(new URL(`../sql/${nome}`, import.meta.url), 'utf8'))
    }
  })
  await verificar('anônimo, analista, gestor e admin inativo não criam snapshot', async () => {
    for (const [id, role] of [['','anon'], [analista,'authenticated'], [gestor,'authenticated'], [inativo,'authenticated']]) {
      await login(id, role)
      await assert.rejects(criar, /permission denied|Acesso restrito/)
    }
  })
  await verificar('tabela de operações é privada e confirmação exige admin ativo', async()=>{
    for(const [id,role] of [['','anon'],[analista,'authenticated'],[gestor,'authenticated'],[inativo,'authenticated']]) {
      await login(id,role)
      await assert.rejects(()=>query(`select public.confirmar_lotes_web('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','x','x',null,0,'[]')`),/permission denied|Acesso restrito/)
      await assert.rejects(()=>query('select * from public.lote_operacoes'),/permission denied/)
    }
  })
  await login(admin)
  await verificar('base vazia e página fora do intervalo', async () => {
    const vazio = await criar()
    assert.equal(vazio.total, 0); assert.equal(vazio.paginas, 0)
    await assert.rejects(() => ler(vazio.snapshotId, 0), /Página inválida/)
  })
  await db.exec('reset role')
  await db.exec(`insert into casos(caso_id,code_a,code_b,ativo,municipio_a,municipio_b,tipo,similaridade) select i::text, 'A'||i, 'B'||i, true, 'TESTE', 'TESTE', 'Duplicidade', 90 from generate_series(1,1001) i`)
  await db.exec(`insert into matriculas select 'A'||i from generate_series(1,1001) i union all select 'B'||i from generate_series(1,1001) i`)
  await login(admin)
  let snapshot
  await verificar('1001 casos em uma página compacta e índices inválidos', async () => {
    snapshot = await criar()
    assert.equal(snapshot.total, 1001)
    assert.equal((await ler(snapshot.snapshotId,0)).casos.length,1001)
    for (const pagina of [-1,1,null]) await assert.rejects(() => ler(snapshot.snapshotId,pagina), /Página inválida/)
  })
  await verificar('confirmação é atômica, revalidada e idempotente', async () => {
    const operacao='10000000-0000-0000-0000-000000000001'
    const lotes=[{analistaId:analista,grupos:[{casoIds:['1'],matriculas:['A1','B1']}]}]
    const executar=(op=operacao,pedido=lotes)=>query(`select public.confirmar_lotes_web($1,$2,'Entrega teste','TESTE',null,0,$3::jsonb) resultado`,[snapshot.snapshotId,op,JSON.stringify(pedido)])
    const primeira=(await executar()).rows[0].resultado
    assert.deepEqual({lotes:primeira.lotes,casos:primeira.casos,repetida:primeira.repetida},{lotes:1,casos:1,repetida:false})
    assert.equal((await executar()).rows[0].resultado.repetida,true)
    await assert.rejects(()=>executar(operacao,[{...lotes[0],analistaId:outro}]),/outro conteúdo/)
    await db.exec('reset role')
    assert.equal((await query('select count(*)::integer n from lote_casos')).rows[0].n,1)
    assert.equal((await query('select count(*)::integer n from lote_eventos')).rows[0].n,1)
    await db.exec('delete from lote_eventos; delete from lote_casos; delete from lote_matriculas; delete from lotes; delete from lote_operacoes;')
    await login(admin)
    const fresca=await criar(), falha='10000000-0000-0000-0000-000000000002'
    await db.exec("reset role; insert into reservas(caso_id,expira_em) values('7',now()+interval '30 minutes')")
    await login(admin)
    await assert.rejects(()=>query(`select public.confirmar_lotes_web($1,$2,'Entrega teste','TESTE',null,0,$3::jsonb)`,[fresca.snapshotId,falha,JSON.stringify([{analistaId:analista,grupos:[{casoIds:['7'],matriculas:['A7','B7']}]}])]),/reserva vigente/)
    await db.exec('reset role')
    assert.equal((await query('select count(*)::integer n from lote_operacoes')).rows[0].n,0)
    await db.exec("delete from reservas where caso_id='7'"); await login(admin)
    snapshot=fresca
    const inexistente='10000000-0000-0000-0000-000000000003'
    await assert.rejects(()=>query(`select public.confirmar_lotes_web($1,$2,'Entrega teste','TESTE',null,0,$3::jsonb)`,[fresca.snapshotId,inexistente,JSON.stringify([{analistaId:analista,grupos:[{casoIds:['novo'],matriculas:['N1','N2']}]}])]),/não pertence à prévia/)
  })
  await verificar('admin sem acesso direto ao cache e snapshot alheio', async () => {
    for (const tabela of ['lote_snapshots', 'lote_snapshot_paginas', 'lote_operacoes']) {
      for (const sql of [`select * from ${tabela}`, `delete from ${tabela}`, `insert into ${tabela} default values`]) {
        await assert.rejects(() => query(sql), /permission denied/)
      }
    }
    await login(outro)
    await assert.rejects(() => ler(snapshot.snapshotId,0), /expirada ou substituída/)
    await login(admin)
  })
  await verificar('mudanças posteriores não alteram páginas materializadas', async () => {
    const antes = await ler(snapshot.snapshotId,0)
    await db.exec(`reset role; update casos set similaridade = 10; insert into revisoes(caso_id) values ('1'); insert into reservas(caso_id,expira_em) values ('2',now()+interval '30 minutes'),('3',now()-interval '1 minute')`)
    await login(admin)
    assert.deepEqual(await ler(snapshot.snapshotId,0), antes)
    const novo = await criar()
    await assert.rejects(() => ler(snapshot.snapshotId,0), /expirada ou substituída/)
    snapshot = novo
    const pagina = (await ler(snapshot.snapshotId,0)).casos
    assert.equal(pagina.find(c=>c.caso_id==='1').revisado,true)
    assert.ok(pagina.every(c=>c.similaridade===10))
  })
  await verificar('revogação do perfil impede leitura; expiração impede leitura', async () => {
    await db.exec('reset role')
    await query('update perfis set ativo=false where id=$1',[admin])
    await login(admin)
    await assert.rejects(() => ler(snapshot.snapshotId,0), /Acesso restrito/)
    await db.exec('reset role')
    await query('update perfis set ativo=true where id=$1',[admin])
    await db.exec("update lote_snapshots set expira_em=now()-interval '1 minute'")
    await login(admin)
    await assert.rejects(() => ler(snapshot.snapshotId,0), /expirada ou substituída/)
  })
  await verificar('reservas e vínculos operacionais são calculados no servidor', async () => {
    await db.exec('reset role')
    await db.exec(`update casos set ativo=false where caso_id='4';`)
    const op='20000000-0000-0000-0000-000000000001'
    await query("insert into lote_operacoes(id,criado_por,pedido) values($1,$2,'{}')",[op,admin])
    const lote = (await query(`insert into lotes(nome,municipio,analista_id,criado_por,operacao_id)
      values('Teste','TESTE',$1,$2,$3) returning id`,[analista,admin,op])).rows[0].id
    await query('insert into lote_casos(caso_id,lote_id) values($1,$2)',['5',lote])
    await query('insert into lote_matriculas(code,lote_id) values($1,$2)',['A4',lote])
    await db.exec("update casos set code_a='A4' where caso_id='6'")
    await login(admin)
    const meta = await criar(), casos = []
    for (let i=0;i<meta.paginas;i++) casos.push(...(await ler(meta.snapshotId,i)).casos)
    assert.equal(casos.length,1000)
    assert.equal(casos.find(c=>c.caso_id==='2').reservado,true)
    assert.equal(casos.find(c=>c.caso_id==='3').reservado,false)
    assert.equal(casos.find(c=>c.caso_id==='5').atribuido,true)
    assert.equal(casos.find(c=>c.caso_id==='6').atribuido,true)
    await login(outro)
    await criar()
    await login(admin)
    assert.equal((await ler(meta.snapshotId,0)).casos.length,1000)
    await db.exec('reset role; delete from lote_casos; delete from lote_matriculas; delete from lotes; delete from lote_operacoes;')
  })
  await verificar('rollback de criação mantém snapshot anterior íntegro', async () => {
    await login(admin)
    const anterior = await criar()
    await db.exec('begin')
    const cancelado = await criar()
    await db.exec('rollback')
    assert.equal((await ler(anterior.snapshotId,0)).casos.length,1000)
    await assert.rejects(() => ler(cancelado.snapshotId,0), /expirada ou substituída/)
  })
  await verificar('lote tem precedência e novos casos relacionados não vazam pela regra antiga',async()=>{
    await db.exec('reset role')
    await query('insert into distribuicoes(analista_id,municipio) values($1,$3),($2,$3)',[analista,analista2,'TESTE'])
    const op='30000000-0000-0000-0000-000000000001'
    await query("insert into lote_operacoes(id,criado_por,pedido) values($1,$2,'{}')",[op,admin])
    const lote=(await query("insert into lotes(nome,municipio,analista_id,criado_por,operacao_id,estado) values('L','TESTE',$1,$2,$3,'ativo') returning id",[analista,admin,op])).rows[0].id
    await query('insert into lote_casos(caso_id,lote_id) values($1,$2)',['1',lote])
    await query("insert into lote_matriculas(code,lote_id) values('A1',$1),('B1',$1)",[lote])
    await db.exec("insert into matriculas(code) values('NOVO'); insert into casos(caso_id,code_a,code_b,ativo,municipio_a,municipio_b,tipo,similaridade) values('novo','A1','NOVO',true,'TESTE','TESTE','Duplicidade',90)")
    const autorizados=async id=>{await login(id);return (await query('select caso_id from public.casos_autorizados_web()')).rows.map(x=>x.caso_id)}
    assert.ok((await autorizados(analista)).includes('1'))
    assert.ok(!(await autorizados(analista2)).includes('1'))
    assert.ok(!(await autorizados(analista)).includes('2'))
    assert.ok((await autorizados(analista2)).includes('2'))
    assert.ok(!(await autorizados(analista)).includes('novo'))
    assert.ok(!(await autorizados(analista2)).includes('novo'))
    assert.ok((await autorizados(admin)).includes('novo'))
    await db.exec("reset role; update lotes set estado='pausado' where id="+lote)
    assert.ok(!(await autorizados(analista)).includes('1'))
    await db.exec("reset role; update lotes set estado='ativo' where id="+lote)
    await login(analista)
    const meus=(await query('select * from public.listar_meus_lotes_web()')).rows
    assert.equal(meus.length,1);assert.equal(meus[0].id,lote)
    const resumo=(await query('select public.resumo_fila_web() resultado')).rows[0].resultado
    assert.equal(resumo.total,1)
    await db.exec('reset role')
    await db.exec(await readFile(new URL('../sql/LOTES_04_REVERTER_FILA.sql',import.meta.url),'utf8'))
    assert.ok((await autorizados(analista2)).includes('1'))
    await db.exec('reset role')
    await db.exec(await readFile(new URL('../sql/LOTES_04_ATIVAR_FILA.sql',import.meta.url),'utf8'))
    await db.exec("reset role; delete from casos where caso_id='novo'; delete from matriculas where code='NOVO'; delete from lote_casos; delete from lote_matriculas; delete from lotes; delete from lote_operacoes; delete from distribuicoes;")
  })
  await verificar('139940 casos: criação, leitura completa e divisão entre 20 analistas', async () => {
    await db.exec(`reset role; delete from revisoes; delete from reservas; delete from casos; delete from matriculas;
      insert into casos(caso_id,code_a,code_b,ativo,municipio_a,municipio_b,tipo,similaridade) select i::text, 'A'||((i-1)/5), 'B'||i, true, 'TESTE', 'TESTE', 'Duplicidade', 90 from generate_series(1,139940) i;
      insert into matriculas select distinct code from (select code_a code from casos union all select code_b from casos) x;
      analyze casos;`)
    await login(admin)
    const inicio = performance.now()
    const meta = await criar()
    const criacaoMs = performance.now()-inicio
    assert.equal(meta.total,139940); assert.equal(meta.paginas,28)
    const casos = [], inicioLeitura = performance.now()
    bytesTransmitidos = 0
    for (let i=0;i<meta.paginas;i++) casos.push(...(await ler(meta.snapshotId,i)).casos)
    const leituraMs = performance.now()-inicioLeitura
    assert.equal(new Set(casos.map(c=>c.caso_id)).size,139940)
    const inicioCalculo = performance.now()
    const previa = gerarPrevia({casos,analistas:Array.from({length:20},(_,i)=>`analista-${i}`),recorte:{municipio:'TESTE'},snapshotCompleto:true})
    const calculoMs = performance.now()-inicioCalculo
    assert.equal(previa.distribuidos,139940); assert.equal(previa.naoDistribuidos,0)
    console.log(JSON.stringify({ambiente:'PGlite local, sem rede',casos:casos.length,paginas:meta.paginas,criacaoMs,leituraMs,calculoMs,bytesTransmitidos,bytesJSONExpandido:Buffer.byteLength(JSON.stringify(casos)),menorCarga:Math.min(...previa.lotes.map(l=>l.quantidade)),maiorCarga:Math.max(...previa.lotes.map(l=>l.quantidade))}))
    // Cliente real ligado às RPCs SQL (sem PostgREST/rede), não respostas simuladas.
    const integrado = await carregarSnapshot({rpc: async (nome,args) => ({data: nome==='criar_snapshot_lotes_web'
      ? await criar() : await lerBruto(args.p_snapshot_id,args.p_pagina),error:null})})
    assert.deepEqual(integrado.casos,casos)
  })
  console.log(`${verificacoes} verificações SQL passaram. Concorrência real, PostgREST e Supabase NÃO testados.`)
} finally { await db.close() }
