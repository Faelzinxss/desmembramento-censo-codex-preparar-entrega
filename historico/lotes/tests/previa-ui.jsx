// Fixture manual somente para Vite dev. Não importa o cliente Supabase real.
// Abrir /tests/previa-ui.html. Não faz parte do entrypoint de produção.
import React from 'react'
import { createRoot } from 'react-dom/client'
import PreviaLotes from '../src/lotes/PreviaLotes.jsx'
import '../src/styles.css'
window.confirm=()=>true

const cliente = { rpc(nome) {
  const expiraEm = new Date(Date.now() + 20000).toISOString()
  const respostas = {
    listar_analistas_web: [{id:'ana',nome:'Ana Silva',perfil:'analista'}, {id:'bruno',nome:'Bruno Costa',perfil:'analista'}],
    contagem_municipios_web: [{municipio:'ELDORADO'}],
    contagem_tipos_web: [{tipo:'Duplicidade'}],
    criar_snapshot_lotes_web: {snapshotId:'teste',total:4,paginas:1,tamanhoPagina:5000,versao:2,expiraEm},
    confirmar_lotes_web: {operacaoId:'teste-op',lotes:2,casos:3,repetida:false},
    ler_snapshot_lotes_web: {snapshotId:'teste',total:4,paginas:1,pagina:0,versao:2,casos:[
      ['1','A','B','ELDORADO','ELDORADO','Duplicidade',90,false,false,false],
      ['2','B','C','ELDORADO','ELDORADO','Duplicidade',90,false,false,false],
      ['3','D','E','ELDORADO','ELDORADO','Duplicidade',90,false,false,false],
      ['4','F','G','ELDORADO','ELDORADO','Duplicidade',90,false,true,false],
    ]},
  }
  const resposta = Promise.resolve({data:respostas[nome],error:null})
  resposta.abortSignal = () => resposta
  return resposta
} }
const gerar=async(c,opcoes)=>(await import('../src/lotes/prepararPrevia.js')).prepararPrevia(c,opcoes).then(r=>({...r,operacaoId:'teste-op'}))
createRoot(document.getElementById('root')).render(<main style={{padding:'1rem'}}><p>Teste local com dados sintéticos</p><PreviaLotes cliente={cliente} gerar={gerar}/></main>)
