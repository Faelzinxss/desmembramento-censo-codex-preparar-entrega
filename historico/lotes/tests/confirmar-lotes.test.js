import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmarLotes } from '../src/lotes/confirmarLotes.js'

const previa=()=>({snapshotId:'snap',operacaoId:'op',expiraEm:new Date(Date.now()+60000).toISOString(),lotes:[
  {analistaId:'a',grupos:[{casoIds:['1','2'],matriculas:['A','B','C'],quantidade:2}]},
  {analistaId:'b',grupos:[]},
]})
function cliente(resposta={operacaoId:'op',lotes:1,casos:2,repetida:false}) {
  const chamadas=[]
  return {chamadas,rpc(nome,parametros){chamadas.push({nome,parametros});const p=Promise.resolve({data:resposta,error:null});p.abortSignal=()=>p;return p}}
}
test('envia somente lotes com grupos e remove campos calculados',async()=>{
  const c=cliente(),resultado=await confirmarLotes(c,previa(),{nome:'Entrega',municipio:'ELDORADO',tipo:'Duplicidade',similaridadeMinima:'80'})
  assert.equal(resultado.casos,2); assert.equal(c.chamadas.length,1)
  assert.deepEqual(c.chamadas[0],{nome:'confirmar_lotes_web',parametros:{p_snapshot_id:'snap',p_operacao_id:'op',p_nome:'Entrega',p_municipio:'ELDORADO',p_tipo:'Duplicidade',p_similaridade_minima:80,p_lotes:[{analistaId:'a',grupos:[{casoIds:['1','2'],matriculas:['A','B','C']}]}]}})
})
test('preserva erro do banco para permitir gerar nova prévia',async()=>{
  const c={rpc(){const p=Promise.resolve({error:{message:'Reserva vigente'}});p.abortSignal=()=>p;return p}}
  await assert.rejects(confirmarLotes(c,previa(),{nome:'x',municipio:'x',similaridadeMinima:0}),/Reserva vigente/)
})
test('recusa prévia expirada, vazia e resposta incompatível',async()=>{
  const p=previa();p.expiraEm='2000-01-01T00:00:00Z'
  await assert.rejects(confirmarLotes(cliente(),p,{nome:'x',municipio:'x',similaridadeMinima:0}),/expirada/)
  const vazia=previa();vazia.lotes[0].grupos=[]
  await assert.rejects(confirmarLotes(cliente(),vazia,{nome:'x',municipio:'x',similaridadeMinima:0}),/casos livres/)
  await assert.rejects(confirmarLotes(cliente({operacaoId:'outra'}),previa(),{nome:'x',municipio:'x',similaridadeMinima:0}),/Resposta inválida/)
})
