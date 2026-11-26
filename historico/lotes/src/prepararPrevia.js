import { carregarSnapshot } from './carregarSnapshot.js'

// Serviço pronto para a futura tela. O Worker mantém o cálculo fora da UI.
// Resultado consultivo: confirmação futura precisa revalidar tudo no banco.
export async function prepararPrevia(supabase, { analistas, recorte, signal, onProgress }) {
  const snapshot = await carregarSnapshot(supabase, { signal, onProgress })
  signal?.throwIfAborted()
  onProgress?.('Equilibrando os grupos entre os analistas…')
  const resultado = await new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./previa.worker.js', import.meta.url), { type: 'module' })
    const terminar = (erro, valor) => {
      worker.terminate()
      signal?.removeEventListener('abort', cancelar)
      if (erro) reject(erro)
      else resolve(valor)
    }
    const cancelar = () => terminar(signal.reason || new Error('Prévia cancelada.'))
    signal?.addEventListener('abort', cancelar, { once: true })
    worker.onmessage = ({ data }) => terminar(data.erro ? new Error(data.erro) : null, data.resultado)
    worker.onerror = () => terminar(new Error('Falha no cálculo da prévia.'))
    worker.onmessageerror = () => terminar(new Error('Resposta inválida do cálculo da prévia.'))
    try {
      worker.postMessage({ casos: snapshot.casos, snapshotCompleto: true, analistas, recorte })
    } catch (erro) { terminar(erro) }
  })
  if (Date.parse(snapshot.expiraEm) <= Date.now()) throw new Error('Prévia expirada. Gere novamente.')
  return { ...resultado, snapshotId: snapshot.snapshotId, expiraEm: snapshot.expiraEm, operacaoId: crypto.randomUUID() }
}
