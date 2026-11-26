import test from 'node:test'
import assert from 'node:assert/strict'
import { carregarSnapshot } from '../src/lotes/carregarSnapshot.js'
import { gerarPrevia } from '../src/lotes/gerarPrevia.js'

const caso = i => ({ caso_id: String(i), code_a: `A${i}`, code_b: `B${i}`,
  ativo: true, revisado: false, reservado: false, atribuido: false,
  municipio_a: 'ELDORADO', municipio_b: 'ELDORADO', tipo: 'Duplicidade', similaridade: 90 })

function servidor(casos, alterar = x => x, versao = 1) {
  const congelados = structuredClone(casos), chamadas = []
  const tamanhoPagina = versao === 2 ? 5000 : 500
  const meta = { snapshotId: 'snapshot-1', total: casos.length, paginas: Math.ceil(casos.length / tamanhoPagina),
    tamanhoPagina, versao, expiraEm: new Date(Date.now() + 120000).toISOString() }
  return {
    chamadas,
    rpc(nome, args) {
      chamadas.push({ nome, args })
      const data = nome === 'criar_snapshot_lotes_web' ? { ...meta } : {
        snapshotId: meta.snapshotId, total: meta.total, paginas: meta.paginas, versao,
        pagina: args.p_pagina, casos: congelados.slice(args.p_pagina * tamanhoPagina, (args.p_pagina + 1) * tamanhoPagina)
          .map(c => versao === 1 ? c : [c.caso_id,c.code_a,c.code_b,c.municipio_a,c.municipio_b,c.tipo,c.similaridade,c.revisado,c.reservado,c.atribuido]),
      }
      return Promise.resolve(alterar({ data, error: null }, nome, args))
    },
  }
}

test('carrega mais de mil casos e inclui relação externa na última página', async () => {
  const casos = Array.from({ length: 1001 }, (_, i) => caso(i))
  casos[1000] = { ...casos[1000], code_a: 'A0', municipio_a: 'OUTRO', municipio_b: 'OUTRO' }
  const cliente = servidor(casos)
  const snapshot = await carregarSnapshot(cliente)
  assert.equal(snapshot.casos.length, 1001)
  assert.deepEqual(cliente.chamadas.slice(1).map(c => c.args.p_pagina), [0, 1, 2])
  const previa = gerarPrevia({ ...snapshot, analistas: ['a'], recorte: { municipio: 'ELDORADO' } })
  assert.equal(previa.distribuidos, 999)
  assert.deepEqual(previa.bloqueados[0].casoIds, ['0'])
})

test('formato compacto preserva exatamente os casos e a divisão com relação cruzando páginas', async () => {
  const casos = Array.from({length:5001},(_,i)=>caso(i))
  casos[5000].code_a = 'A0'
  casos[5000].reservado = true
  casos[5].municipio_b = null
  const cliente = servidor(casos, x=>x, 2)
  const compacto = await carregarSnapshot(cliente)
  const anterior = await carregarSnapshot(servidor(casos))
  assert.deepEqual(compacto.casos,anterior.casos)
  assert.equal(cliente.chamadas.length,3)
  const calcular = snapshot => gerarPrevia({...snapshot,analistas:['a','b'],recorte:{municipio:'ELDORADO'}})
  assert.deepEqual(calcular(compacto),calcular(anterior))
  assert.equal(calcular(compacto).naoDistribuidos,2)
})

test('formato compacto recusa campos faltantes, flags ambíguas e versão misturada', async () => {
  for (const alterar of [d=>d.casos[0].pop(), d=>{d.casos[0][8]=1}, d=>{d.casos[0][6]=null},
    d=>{d.versao=1}, d=>{d.casos[0][0]=''}, d=>{d.casos[0][3]={}}]) {
    const cliente = servidor([caso(1)], (r,nome)=>{
      if(nome==='ler_snapshot_lotes_web') alterar(r.data)
      return r
    },2)
    await assert.rejects(carregarSnapshot(cliente),/inválido|inconsistente/)
  }
})

test('base alterada entre páginas não muda a cópia recebida', async () => {
  const casos = Array.from({ length: 501 }, (_, i) => caso(i))
  const cliente = servidor(casos, resposta => { casos[500].reservado = true; return resposta })
  assert.equal((await carregarSnapshot(cliente)).casos[500].reservado, false)
})

test('recusa páginas truncadas, trocadas e IDs duplicados', async () => {
  const casos = Array.from({ length: 501 }, (_, i) => caso(i))
  for (const alterar of [
    d => { d.casos = [] }, d => { d.snapshotId = 'outro' },
    d => { d.pagina = 0 }, d => { d.total = 502 }, d => { d.casos[0] = caso(0) },
  ]) {
    const cliente = servidor(casos, (resposta, nome, args) => {
      if (args.p_pagina === 1) alterar(resposta.data)
      return resposta
    })
    await assert.rejects(carregarSnapshot(cliente), /incompleto|inconsistente|repetido/)
  }
})

test('erro de autorização ou expiração no servidor não produz snapshot parcial', async () => {
  for (const mensagem of ['Acesso restrito ao administrador', 'Prévia expirada ou substituída']) {
    const cliente = servidor([caso(1)], (resposta, nome) => nome === 'ler_snapshot_lotes_web'
      ? { error: { message: mensagem } } : resposta)
    await assert.rejects(carregarSnapshot(cliente), { message: mensagem })
  }
})

test('valida metadados, validade e snapshot vazio', async () => {
  const vazio = await carregarSnapshot(servidor([]))
  assert.deepEqual(vazio.casos, [])
  assert.equal(vazio.snapshotCompleto, true)
  for (const extra of [{ total: -1 }, { paginas: 3 }, { versao: 2 }, { tamanhoPagina: 1000 },
    { expiraEm: 'inválido' }, { expiraEm: '2000-01-01T00:00:00Z' }]) {
    await assert.rejects(carregarSnapshot(servidor([], resposta => {
      Object.assign(resposta.data, extra)
      return resposta
    })), /inválidos|expirada/)
  }
})

test('cancelamento antes da consulta não inicia RPC', async () => {
  const cliente = servidor([]), controle = new AbortController()
  controle.abort()
  await assert.rejects(carregarSnapshot(cliente, { signal: controle.signal }), { name: 'AbortError' })
  assert.equal(cliente.chamadas.length, 0)
})

test('vínculo de matrícula sem caso ativo bloqueia a distribuição', async () => {
  const snapshot = await carregarSnapshot(servidor([{ ...caso(1), atribuido: true }]))
  const previa = gerarPrevia({ ...snapshot, analistas: ['a'], recorte: { municipio: 'ELDORADO' } })
  assert.equal(previa.distribuidos, 0)
  assert.match(previa.bloqueados[0].motivos[0], /atribuída/)
})
