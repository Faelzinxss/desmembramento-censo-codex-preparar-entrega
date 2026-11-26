# Histórico — não executar em produção

Esta pasta reúne implementações e correções que não fazem parte do fluxo atual.
Elas foram preservadas para rastreabilidade e também continuam disponíveis no
histórico do Git.

- `lotes/`: proposta encerrada de divisão física da fila, incluindo código, SQL,
  testes e documentação. A fila de produção usa distribuições compartilhadas com
  reserva exclusiva por caso.
- `correcoes_202609/`: correções extraordinárias de município e Backoffice já
  incorporadas ao sincronizador principal.
- `correcoes_antigas/`: versões anteriores e testes legados.
- `contexto/`: documentos de retomada superados pela documentação principal.
- `testes_distribuicao/`: validações pontuais das migrações de distribuição já
  aplicadas; dependem de um runtime PGlite externo e não são a suíte ativa do app.

Para entender ou operar o sistema atual, use `docs/DOCUMENTACAO_PROJETO.md`. Não
copie arquivos desta pasta de volta para o fluxo ativo sem uma nova revisão técnica.
