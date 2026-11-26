import React,{useEffect,useState} from 'react'

const numero=v=>new Intl.NumberFormat('pt-BR').format(v||0)
export default function MeusLotes({cliente,onContinuar}) {
  const [lotes,setLotes]=useState(null)
  useEffect(()=>{let ativo=true;cliente.rpc('listar_meus_lotes_web').then(({data,error})=>{
    if(ativo)setLotes(error?[]:(data||[]))
  });return()=>{ativo=false}},[cliente])
  if(!lotes?.length)return null
  return <section className="my-batches" aria-label="Meus lotes"><div className="queue-title"><h2>Meus lotes</h2></div>
    <div className="my-batches-list">{lotes.map(l=><article key={l.id}><div><small>{l.estado==='pausado'?'Pausado':'Em andamento'}</small><h3>{l.nome}</h3><p>{l.municipio}{l.tipo?` · ${l.tipo}`:''}</p></div><div className="my-batches-numbers"><span><b>{numero(l.pendentes)}</b> pendentes</span><span><b>{numero(l.em_analise)}</b> em análise</span><span><b>{numero(l.concluidos)}</b> concluídos</span></div><button disabled={l.estado!=='ativo'||!l.pendentes} onClick={()=>onContinuar(l)}>Continuar lote</button></article>)}</div>
  </section>
}
