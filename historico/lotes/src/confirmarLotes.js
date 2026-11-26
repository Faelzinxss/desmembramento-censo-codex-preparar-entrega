export async function confirmarLotes(cliente, previa, { nome, municipio, tipo, similaridadeMinima, signal }) {
  if (!previa?.snapshotId || !previa?.operacaoId || Date.parse(previa.expiraEm) <= Date.now()) throw new Error('Prévia expirada. Gere novamente.')
  const lotes = previa.lotes.filter(l => l.grupos.length).map(l => ({ analistaId:l.analistaId,
    grupos:l.grupos.map(g => ({ casoIds:g.casoIds, matriculas:g.matriculas })) }))
  if (!lotes.length) throw new Error('Não há casos livres para confirmar.')
  let consulta = cliente.rpc('confirmar_lotes_web', { p_snapshot_id:previa.snapshotId,
    p_operacao_id:previa.operacaoId, p_nome:nome, p_municipio:municipio,
    p_tipo:tipo || null, p_similaridade_minima:Number(similaridadeMinima), p_lotes:lotes })
  if (signal) consulta=consulta.abortSignal(signal)
  const {data,error}=await consulta
  if (error) throw new Error(error.message || 'Não foi possível confirmar a divisão.')
  if (!data || data.operacaoId!==previa.operacaoId || !Number.isSafeInteger(data.lotes) || !Number.isSafeInteger(data.casos)) throw new Error('Resposta inválida da confirmação.')
  return data
}
