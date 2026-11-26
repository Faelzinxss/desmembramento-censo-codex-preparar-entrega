import test from 'node:test'
import assert from 'node:assert/strict'
import { gerarPrevia } from '../src/lotes/gerarPrevia.js'

const caso = (id, a, b, extra = {}) => ({ caso_id: id, code_a: a, code_b: b,
  ativo: true, revisado: false, reservado: false, atribuido: false,
  municipio_a: 'ELDORADO', municipio_b: 'ELDORADO', tipo: 'Duplicidade', similaridade: 90, ...extra })
const previa = (casos, extra = {}) => gerarPrevia({ casos, analistas: ['joao', 'maria'],
  recorte: { municipio: 'ELDORADO' }, snapshotCompleto: true, ...extra })

test('mantém componente transitivo A-B, A-C, C-D junto', () => {
  const r = previa([caso('1','A','B'), caso('2','A','C'), caso('3','C','D'), caso('4','X','Y')])
  assert.deepEqual(r.lotes.map(l => l.quantidade), [3, 1])
  assert.deepEqual(r.lotes[0].grupos[0].casoIds, ['1','2','3'])
  assert.deepEqual(r.gruposGrandes, ['A'])
})
test('prévia determinística com entrada embaralhada', () => {
  const casos = [caso('1','A','B'), caso('2','C','D'), caso('3','E','F')]
  assert.deepEqual(previa(casos), previa([...casos].reverse(), { analistas: ['maria','joao'] }))
})
test('bloqueia grupo com pendência fora de município, tipo ou similaridade', () => {
  for (const extra of [{municipio_a:'OUTRO',municipio_b:'OUTRO'}, {tipo:'Outro'}, {similaridade:10}]) {
    const r = previa([caso('1','A','B'), caso('2','B','C',extra)],
      {recorte:{municipio:'ELDORADO',tipo:'Duplicidade',similaridadeMinima:80}})
    assert.equal(r.distribuidos, 0)
    assert.equal(r.naoDistribuidos, 1)
    assert.match(r.bloqueados[0].motivos[0], /fora do recorte/)
  }
})
test('bloqueia reserva ou atribuição em qualquer membro do grupo', () => {
  for (const extra of [{reservado:true}, {atribuido:true}]) {
    const r = previa([caso('1','A','B'), caso('2','B','C',extra)])
    assert.equal(r.distribuidos, 0)
    assert.equal(r.naoDistribuidos, 2)
  }
})
test('revisados conectam matrículas mas não entram na carga', () => {
  const r = previa([caso('1','A','B'), caso('2','B','C',{revisado:true}), caso('3','C','D')])
  assert.equal(r.distribuidos, 2)
  assert.equal(r.lotes[0].grupos.length, 1)
  assert.deepEqual(r.lotes[0].grupos[0].casoIds, ['1','3'])
})
test('recorte vazio e ausência de pendências não criam trabalho', () => {
  assert.equal(previa([]).distribuidos, 0)
  assert.equal(previa([caso('1','A','B',{revisado:true})]).totalRecorte, 0)
})
test('não duplica caso com o mesmo município nos dois lados', () => {
  assert.equal(previa([caso('1','A','B')]).distribuidos, 1)
})
test('rejeita snapshot parcial, duplicatas e estados desconhecidos', () => {
  assert.throws(() => previa([], {snapshotCompleto:false}), /completo/)
  assert.throws(() => previa([], {analistas:[]}), /analistas/)
  assert.throws(() => previa([], {analistas:['a','a']}), /repetidos/)
  assert.throws(() => previa([caso('1','A','B'),caso('1','A','B')]), /repetido/)
  assert.throws(() => previa([caso('1','A','B',{reservado:undefined})]), /explícito/)
})
test('distribui volume maior sem perder casos nem cruzar matrículas', () => {
  const casos = Array.from({length:10000}, (_, i) => caso(String(i), `A${i}`, `B${i}`))
  const r = previa(casos)
  assert.equal(r.distribuidos, 10000)
  assert.deepEqual(r.lotes.map(l => l.quantidade), [5000,5000])
  assert.equal(new Set(r.lotes.flatMap(l => l.grupos.flatMap(g => g.casoIds))).size,10000)
})
