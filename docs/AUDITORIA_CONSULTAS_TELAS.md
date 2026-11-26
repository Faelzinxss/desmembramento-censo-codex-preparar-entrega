# Auditoria das consultas por tela

Atualizado em 19/09/2026.

## Resultado

| Tela | Situação encontrada | Ajuste preparado |
|---|---|---|
| Fila de casos | A página e as opções já usam cache, mas o resumo global ainda podia contar toda a base a cada 20 segundos. Cada novo recorte também materializava todos os IDs filtrados. | O resumo global passa a ler contadores incrementais. Recortes recebem cache de 30 segundos, lock não bloqueante e índices por tipo, município e similaridade. As opções são carregadas uma vez, em vez de duas RPCs extras a cada filtro. |
| Monitoramento | A RPC é pequena, porém cada heartbeat de qualquer pessoa disparava Realtime, além do polling de 15 segundos e do evento de foco. | Removido o Realtime dessa tela. A leitura ocorre a cada 30 segundos, no foco e com proteção contra repetição em cinco segundos. Os estados usam janelas compatíveis com o heartbeat de 60 segundos. |
| Pendências | O volume dos 159 mil casos já estava pré-calculado, mas cada abertura reagrupava todas as revisões atuais por município e tipo. | Totais de revisões por município/tipo e total geral passam a ser mantidos incrementalmente por gatilho. A tela agrega tabelas pequenas e somente examina as poucas reservas ativas. |
| Produtividade da equipe | Cada consulta unia `revisoes` e todo o histórico e a tela abria outra RPC em paralelo para desmembramentos. | A produtividade passa a ler um resumo diário por pessoa e decisão, atualizado por gatilhos. O detalhe de desmembramentos continua separado, limitado a mil linhas e apoiado por índice. |
| Minha produtividade | Repetia a união completa de revisões e histórico para um único usuário. | Usa o mesmo resumo diário incremental, filtrado pela pessoa autenticada. |

## Segurança dos números

O resumo de produtividade é reconstruído inicialmente a partir da união de
`revisoes` e `revisoes_historico`. Depois, gatilhos registram inserções, alterações
e exclusões. Uma reavaliação continua contando a avaliação original e a correção,
pois a versão anterior entra no histórico antes de a revisão atual ser alterada.

Pendências representam somente o estado atual de `revisoes`; o histórico não entra
nesse painel. A sincronização diária reconstrói os totais de volume e de revisões
depois de atualizar a base, corrigindo mudanças de município, tipo ou ativação.

Os caches da fila afetam apenas exibição e contagens. A abertura e o salvamento de
um caso continuam consultando as tabelas operacionais atuais e validando reserva,
token, usuário, aba e versão da revisão.

## Aplicação

Executar uma vez no SQL Editor:

```text
sql/OTIMIZAR_TELAS_RELATORIOS.sql
```

O resultado final deve apresentar todas as colunas com `true`, inclusive
`produtividade_conciliada_ok` e `pendencias_conciliadas_ok`. Se qualquer coluna
vier `false`, não repetir o arquivo: guardar o resultado e diagnosticar a
divergência.

