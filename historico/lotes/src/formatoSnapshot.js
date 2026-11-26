// Contrato v2, na mesma ordem do jsonb_build_array em LOTES_02_SNAPSHOT.sql.
// Evita repetir dez nomes de campos em cada caso transmitido.
export function decodificarCaso(linha, versao) {
  if (versao === 1) return linha
  if (versao !== 2 || !Array.isArray(linha) || linha.length !== 10) {
    throw new Error('Formato de caso inválido no snapshot.')
  }
  const [caso_id, code_a, code_b, municipio_a, municipio_b, tipo, similaridade,
    revisado, reservado, atribuido] = linha
  if ([caso_id, code_a, code_b, tipo].some(v => typeof v !== 'string' || !v.trim())
    || [municipio_a, municipio_b].some(v => v !== null && typeof v !== 'string')
    || !Number.isFinite(similaridade)
    || [revisado, reservado, atribuido].some(v => typeof v !== 'boolean')) {
    throw new Error('Estado de caso inválido no snapshot.')
  }
  return { caso_id, code_a, code_b, municipio_a, municipio_b, tipo, similaridade,
    revisado, reservado, atribuido, ativo: true }
}
