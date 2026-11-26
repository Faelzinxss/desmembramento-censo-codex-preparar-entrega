import { decodificarCaso } from './formatoSnapshot.js'

// Recebe o cliente autenticado; nunca usa chave privada ou a página da fila.
export async function carregarSnapshot(supabase, { signal, onProgress } = {}) {
  const rpc = async (nome, parametros) => {
    signal?.throwIfAborted()
    let consulta = supabase.rpc(nome, parametros)
    if (signal) consulta = consulta.abortSignal(signal)
    const { data, error } = await consulta
    signal?.throwIfAborted()
    if (error) throw new Error(error.message || 'Não foi possível carregar a prévia.')
    return data
  }
  const meta = await rpc('criar_snapshot_lotes_web', {})
  const tamanhoPagina = meta?.versao === 2 ? 5000 : 500
  if (!meta || ![1, 2].includes(meta.versao) || typeof meta.snapshotId !== 'string' || !meta.snapshotId
    || !Number.isSafeInteger(meta.total) || meta.total < 0
    || meta.tamanhoPagina !== tamanhoPagina || meta.paginas !== Math.ceil(meta.total / tamanhoPagina)
    || !Number.isFinite(Date.parse(meta.expiraEm))) throw new Error('Metadados de prévia inválidos.')
  const casos = [], ids = new Set()
  for (let pagina = 0; pagina < meta.paginas; pagina++) {
    onProgress?.(`Carregando casos: página ${pagina + 1} de ${meta.paginas}…`)
    const dados = await rpc('ler_snapshot_lotes_web', { p_snapshot_id: meta.snapshotId, p_pagina: pagina })
    const esperados = Math.min(tamanhoPagina, meta.total - pagina * tamanhoPagina)
    if (!dados || dados.versao !== meta.versao || dados.snapshotId !== meta.snapshotId || dados.pagina !== pagina
      || dados.total !== meta.total || dados.paginas !== meta.paginas
      || !Array.isArray(dados.casos) || dados.casos.length !== esperados) throw new Error('Snapshot incompleto ou inconsistente. Gere novamente.')
    for (const linha of dados.casos) {
      const caso = decodificarCaso(linha, meta.versao)
      if (!caso || typeof caso.caso_id !== 'string' || !caso.caso_id.trim() || ids.has(caso.caso_id)) {
        throw new Error('Caso inválido ou repetido no snapshot.')
      }
      ids.add(caso.caso_id)
      casos.push(caso)
    }
  }
  if (Date.parse(meta.expiraEm) <= Date.now()) throw new Error('Prévia expirada. Gere novamente.')
  return { casos, snapshotCompleto: true, snapshotId: meta.snapshotId, expiraEm: meta.expiraEm }
}
