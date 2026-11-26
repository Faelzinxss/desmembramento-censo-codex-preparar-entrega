import { gerarPrevia } from './gerarPrevia.js'

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ resultado: gerarPrevia(data) })
  } catch (erro) {
    self.postMessage({ erro: erro.message })
  }
}
