// Cálculo puro: não consulta nem grava no Supabase.
// O chamador deve fornecer TODOS os casos ativos (inclusive fora do recorte),
// com flags de revisão, reserva vigente e atribuição obtidas no servidor.
// Nunca usar apenas a página visível da fila. A confirmação deve revalidar tudo.
export function gerarPrevia({ casos, analistas, recorte, snapshotCompleto = false }) {
  if (!snapshotCompleto) throw new Error('A prévia exige um snapshot completo dos casos ativos.')
  if (!Array.isArray(casos) || !Array.isArray(analistas) || !analistas.length) throw new Error('Informe casos e analistas.')
  const ids = [...analistas].sort()
  if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) throw new Error('Analistas inválidos ou repetidos.')
  if (!recorte || typeof recorte.municipio !== 'string' || !recorte.municipio.trim()) throw new Error('Informe o município.')
  const minimo = recorte.similaridadeMinima ?? 0
  if (!Number.isFinite(minimo) || minimo < 0 || minimo > 100) throw new Error('Similaridade inválida.')
  const parent = new Map(), size = new Map(), vistos = new Set()
  const find = code => {
    if (!parent.has(code)) { parent.set(code, code); size.set(code, 1) }
    let raiz = code
    while (parent.get(raiz) !== raiz) raiz = parent.get(raiz)
    while (code !== raiz) { const proximo = parent.get(code); parent.set(code, raiz); code = proximo }
    return raiz
  }
  const unir = (a, b) => {
    let ra = find(a), rb = find(b)
    if (ra === rb) return
    if (size.get(ra) < size.get(rb)) [ra, rb] = [rb, ra]
    parent.set(rb, ra); size.set(ra, size.get(ra) + size.get(rb))
  }
  for (const c of casos) {
    if (!c || ['caso_id', 'code_a', 'code_b'].some(k => typeof c[k] !== 'string' || !c[k].trim())) throw new Error('Caso sem identificação válida.')
    if (vistos.has(c.caso_id)) throw new Error('Caso repetido no snapshot.')
    vistos.add(c.caso_id)
    if (c.ativo !== true || ['revisado', 'reservado', 'atribuido'].some(k => typeof c[k] !== 'boolean')) throw new Error('Snapshot sem estado operacional explícito.')
    if (!Number.isFinite(c.similaridade)) throw new Error('Caso com similaridade inválida.')
    unir(c.code_a, c.code_b)
  }
  const noRecorte = c => (c.municipio_a === recorte.municipio || c.municipio_b === recorte.municipio)
    && (!recorte.tipo || c.tipo === recorte.tipo) && c.similaridade >= minimo
  const grupos = new Map()
  for (const c of casos) {
    const raiz = find(c.code_a)
    if (!grupos.has(raiz)) grupos.set(raiz, [])
    grupos.get(raiz).push(c)
  }
  const livres = [], bloqueados = []
  let totalRecorte = 0
  for (const grupo of grupos.values()) {
    const candidatos = grupo.filter(c => !c.revisado && noRecorte(c))
    if (!candidatos.length) continue
    totalRecorte += candidatos.length
    const motivos = []
    if (grupo.some(c => c.atribuido)) motivos.push('Matrícula relacionada já atribuída')
    if (grupo.some(c => c.reservado)) motivos.push('Grupo com reserva vigente')
    if (grupo.some(c => !c.revisado && !noRecorte(c))) motivos.push('Pendências relacionadas fora do recorte')
    const casoIds = candidatos.map(c => c.caso_id).sort()
    const matriculas = [...new Set(grupo.flatMap(c => [c.code_a, c.code_b]))].sort()
    const item = { grupoId: matriculas[0], casoIds, matriculas, quantidade: casoIds.length }
    if (motivos.length) bloqueados.push({ ...item, motivos })
    else livres.push(item)
  }
  // LPT: maior grupo primeiro; cada grupo vai para a menor carga prevista.
  // Desempate por ID, independente da ordem recebida do servidor.
  const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0
  livres.sort((a, b) => b.quantidade - a.quantidade || comparar(a.grupoId, b.grupoId))
  bloqueados.sort((a, b) => comparar(a.grupoId, b.grupoId))
  const lotes = ids.map(analistaId => ({ analistaId, quantidade: 0, grupos: [] }))
  for (const grupo of livres) {
    const destino = lotes.reduce((menor, lote) => lote.quantidade < menor.quantidade ? lote : menor)
    destino.grupos.push(grupo); destino.quantidade += grupo.quantidade
  }
  const distribuidos = lotes.reduce((s, lote) => s + lote.quantidade, 0)
  const meta = Math.ceil(distribuidos / ids.length)
  return {
    lotes, bloqueados, totalRecorte, distribuidos,
    naoDistribuidos: totalRecorte - distribuidos,
    gruposGrandes: livres.filter(g => g.quantidade > meta).map(g => g.grupoId),
  }
}
