import React, { useEffect, useRef, useState } from 'react'
import { prepararPrevia } from './prepararPrevia.js'
import { confirmarLotes } from './confirmarLotes.js'
import './previa.css'

const numero = v => new Intl.NumberFormat('pt-BR').format(v)

export default function PreviaLotes({ cliente, gerar = prepararPrevia, confirmar = confirmarLotes }) {
  const [opcoes, setOpcoes] = useState(null)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [municipio, setMunicipio] = useState('')
  const [tipo, setTipo] = useState('')
  const [minimo, setMinimo] = useState('0')
  const [nome, setNome] = useState('')
  const [selecionados, setSelecionados] = useState([])
  const [ocupado, setOcupado] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [previa, setPrevia] = useState(null)
  const [confirmando, setConfirmando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [agora, setAgora] = useState(Date.now())
  const operacao = useRef(null)

  useEffect(() => {
    const controle = new AbortController()
    setErro(''); setOpcoes(null)
    // Opções próprias, sem herdar filtros da fila que podem ocultar municípios.
    Promise.all([
      cliente.rpc('listar_analistas_web').abortSignal(controle.signal),
      cliente.rpc('contagem_municipios_web', { p_situacao: 'Todos', p_tipo: null }).abortSignal(controle.signal),
      cliente.rpc('contagem_tipos_web', { p_situacao: 'Todos', p_municipio: null }).abortSignal(controle.signal),
    ]).then(respostas => {
      if (controle.signal.aborted) return
      const falha = respostas.find(r => r.error)
      if (falha) throw new Error('Não foi possível carregar as opções da equipe. Tente novamente.')
      setOpcoes({ analistas: (respostas[0].data || []).filter(a => a.perfil === 'analista'),
        municipios: respostas[1].data || [], tipos: respostas[2].data || [] })
    }).catch(e => { if (!controle.signal.aborted) setErro(e.message) })
    return () => controle.abort()
  }, [cliente, tentativa])
  useEffect(() => () => operacao.current?.abort(), [])
  useEffect(() => {
    if (!previa) return
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [previa])

  function alterar(fn) { setPrevia(null); setErro(''); setSucesso(''); setProgresso(''); fn() }
  function cancelar() {
    operacao.current?.abort()
    operacao.current = null
    setOcupado(false); setProgresso('Prévia cancelada.')
  }
  async function gerarDivisao(e) {
    e.preventDefault()
    if (operacao.current || !municipio || !selecionados.length) return
    const controle = new AbortController()
    operacao.current = controle
    setOcupado(true); setErro(''); setPrevia(null); setProgresso('Preparando os casos…')
    try {
      const resultado = await gerar(cliente, { analistas: selecionados,
        recorte: { municipio, tipo: tipo || null, similaridadeMinima: Number(minimo) },
        signal: controle.signal, onProgress: texto => { if (!controle.signal.aborted) setProgresso(texto) } })
      if (!controle.signal.aborted) { setPrevia(resultado); setAgora(Date.now()); setProgresso('Prévia pronta.') }
    } catch (e) {
      if (!controle.signal.aborted) setErro(/function|schema cache|PGRST202/i.test(e.message)
        ? 'A prévia ainda não está disponível neste ambiente. A configuração do banco precisa ser concluída.'
        : e.message)
    } finally {
      if (operacao.current === controle) { operacao.current = null; setOcupado(false) }
    }
  }
  async function confirmarDivisao() {
    if (!previa || expirada || confirmando || !nome.trim()) return
    if (!window.confirm(`Confirmar a divisão de ${previa.distribuidos.toLocaleString('pt-BR')} casos entre ${previa.lotes.filter(l=>l.quantidade).length} analistas?`)) return
    setConfirmando(true); setErro(''); setSucesso('')
    try {
      const resultado=await confirmar(cliente,previa,{nome:nome.trim(),municipio,tipo,similaridadeMinima:minimo})
      setSucesso(`Divisão confirmada: ${numero(resultado.casos)} casos em ${numero(resultado.lotes)} lotes.`)
      setPrevia(null); setProgresso('')
    } catch(e) {
      setErro(/function|schema cache|PGRST202/i.test(e.message)
        ? 'A confirmação ainda não está disponível neste ambiente. A configuração do banco precisa ser concluída.' : e.message)
    } finally { setConfirmando(false) }
  }
  const expirada = previa && agora >= Date.parse(previa.expiraEm)
  return <section className="lotes-preview">
    <header><h2>Dividir trabalho por município</h2><p>Escolha a equipe e confira a divisão. Casos com matrículas relacionadas ficam juntos.</p></header>
    {erro && <p className="error" role="alert">{erro}</p>}
    {sucesso && <p className="success" role="status">{sucesso}</p>}
    {!opcoes ? <div>{erro ? <button onClick={() => setTentativa(v => v + 1)}>Tentar novamente</button> : <p role="status">Carregando municípios e equipe…</p>}</div> : <form onSubmit={gerarDivisao}>
      <fieldset disabled={ocupado}>
        <legend>Recorte da entrega</legend>
        <div className="lotes-fields">
          <label>Nome da entrega<input required maxLength="100" value={nome} placeholder="Ex.: Eldorado · setembro" onChange={e => alterar(() => setNome(e.target.value))} /></label>
          <label>Município<select required value={municipio} onChange={e => alterar(() => setMunicipio(e.target.value))}><option value="">Selecione um município</option>{opcoes.municipios.map(m => <option key={m.municipio} value={m.municipio}>{m.municipio}</option>)}</select></label>
          <label>Tipo de ocorrência<select value={tipo} onChange={e => alterar(() => setTipo(e.target.value))}><option value="">Todos os tipos</option>{opcoes.tipos.map(t => <option key={t.tipo} value={t.tipo}>{t.tipo}</option>)}</select></label>
          <label>Similaridade mínima (%)<input required type="number" min="0" max="100" step="0.1" value={minimo} onChange={e => alterar(() => setMinimo(e.target.value))} /></label>
        </div>
      </fieldset>
      <fieldset disabled={ocupado}>
        <legend>Analistas · {selecionados.length} selecionados</legend>
        <div className="lotes-actions"><button className="secondary" type="button" onClick={() => alterar(() => setSelecionados(opcoes.analistas.map(a => a.id)))}>Selecionar todos</button><button className="secondary" type="button" onClick={() => alterar(() => setSelecionados([]))}>Limpar seleção</button></div>
        {!opcoes.analistas.length && <p>Nenhum analista ativo disponível.</p>}
        <div className="lotes-team">{opcoes.analistas.map(a => <label key={a.id}><input type="checkbox" checked={selecionados.includes(a.id)} onChange={e => alterar(() => setSelecionados(ids => e.target.checked ? [...ids, a.id] : ids.filter(id => id !== a.id)))} />{a.nome}</label>)}</div>
      </fieldset>
      <div className="lotes-actions"><button disabled={ocupado || !municipio || !selecionados.length}>{ocupado ? 'Gerando prévia…' : 'Gerar prévia'}</button>{ocupado && <button type="button" className="secondary" onClick={cancelar}>Cancelar</button>}</div>
    </form>}
    <p role="status" aria-live="polite">{progresso}</p>
    {previa && <section aria-label="Resultado da divisão">
      <h3>Divisão proposta · {municipio}</h3>
      {expirada ? <p role="alert" className="error">Esta prévia expirou. Gere novamente para atualizar os casos.</p> : <p>Válida até {new Date(previa.expiraEm).toLocaleTimeString('pt-BR')}. Os casos ainda não foram reservados ou atribuídos.</p>}
      <div className="lotes-totals"><div><span>Pendências no recorte</span><strong>{numero(previa.totalRecorte)}</strong></div><div><span>Na divisão proposta</span><strong>{numero(previa.distribuidos)}</strong></div><div><span>Aguardando análise do supervisor</span><strong>{numero(previa.naoDistribuidos)}</strong></div></div>
      {!previa.totalRecorte && <p>Nenhuma pendência encontrada para este recorte.</p>}
      {previa.gruposGrandes.length > 0 && <p className="lotes-warning">{numero(previa.gruposGrandes.length)} grupo(s) maior(es) que a média por analista. A carga pode variar para manter as matrículas relacionadas juntas.</p>}
      <div className="lotes-table"><table><caption>Quantidade proposta por analista</caption><thead><tr><th>Analista</th><th>Casos</th><th>Grupos relacionados</th></tr></thead><tbody>{previa.lotes.map(l => <tr key={l.analistaId}><th scope="row">{opcoes?.analistas.find(a => a.id === l.analistaId)?.nome || 'Analista'}</th><td>{numero(l.quantidade)}</td><td>{numero(l.grupos.length)}</td></tr>)}</tbody></table></div>
      {!!previa.bloqueados.length && <details><summary>Grupos impedidos de entrar na divisão: {numero(previa.bloqueados.length)}</summary><p>Corrija os conflitos e gere outra prévia. Exibindo até 50 grupos.</p><ul>{previa.bloqueados.slice(0,50).map(g => <li key={g.grupoId}><strong>Matrícula {g.grupoId} · {numero(g.quantidade)} {g.quantidade === 1 ? 'caso' : 'casos'}</strong><p>{g.motivos.join('; ')}.</p></li>)}</ul></details>}
      <div className="lotes-confirm"><button disabled={expirada || confirmando || !previa.distribuidos || !nome.trim()} onClick={confirmarDivisao} aria-describedby="lotes-confirm-note">{confirmando ? 'Confirmando…' : 'Confirmar divisão'}</button><p id="lotes-confirm-note">O banco verificará novamente reservas, avaliações, matrículas e permissões. Se algo mudou desde a prévia, nada será gravado.</p></div>
    </section>}
  </section>
}
