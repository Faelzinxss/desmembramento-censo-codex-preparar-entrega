# Atualização da base de 25/09/2026

## Estado em 28/09 — carga concluída e auditada

O usuário confirmou que o SQLite oficial é o resultado completo do recálculo.
A primeira tentativa foi bloqueada corretamente pela proteção de 20%. Depois da
confirmação de que o SQLite era o recálculo completo, a regra de preservação foi
aplicada e retornou os três testes `true`. A carga foi concluída em 10,9 minutos.

- Origem: 259.424 linhas; 212.127 com suspeito; 153.378 pares únicos.
- Preparação: 53.712 pares no escopo; 99.666 fora do corte.
- Ausentes em relação aos casos ativos do Supabase: 24.915.
- 5.563 continuam como par na origem, mas estão fora do corte.
- 19.352 não aparecem mais como par; ambas as matrículas continuam na origem.
- Na auditoria, 7.319 ausentes tinham revisão e 17.596 não tinham.
- Estes totais são uma fotografia; a equipe continua trabalhando.

## Regra solicitada

Casos ativos e casos já revisados ficam disponíveis na consulta, sem duplicidade.
Pendentes antigos sem revisão não permanecem na fila se saírem da origem.
Casos revisados inativos recebem o indicador “Fora da base atual”.
Reavaliação supervisionada mantém token, versão, locks e histórico V2.
Filtros explícitos de município, tipo e similaridade continuam aplicáveis.
O painel de pendências permanece restrito à base ativa.

## Evidências da carga

- Backup íntegro: `backups/backup_supabase_20260928_122211.json.gz`.
- Avaliações no backup: 18.942; após a carga: 18.983.
- Avaliações novas e legítimas durante a operação: 41.
- IDs de avaliações antigas ausentes após a carga: zero.
- Histórico antes/depois: 43 registros.
- Casos ativos imediatamente após a carga: 53.713; um ficou ativo por reserva.
- Concluídos preservados fora da base atual: 7.590.
- A verificação residual foi iniciada após a auditoria para identificar somente
  alterações/reservas ocorridas durante a carga.

Build passou e cinco testes locais passaram, incluindo as definições reais que
estavam instaladas no Supabase. O frontend sinaliza `Fora da base atual`.

## Decisão posterior: atualizações acumulativas

Depois da carga foi decidido que a ausência no SQLite diário não deve retirar um
caso do sistema. A rotina padrão agora insere casos novos, atualiza casos
existentes e preserva os ausentes. A desativação por ausência ficou restrita à
reconciliação excepcional. Consulte `docs/SINCRONIZACAO_ACUMULATIVA.md`.

Os 24.915 casos desativados por esta carga precisam ser restaurados a partir de
uma lista anterior confiável. O backup criado antes do envio não contém `casos`,
e o banco de controle deste computador é anterior à carga; reativar todos os
inativos misturaria esses casos com exclusões antigas legítimas.

## Atualização acumulativa da noite

A fonte oficial foi modificada às 16:09 e a rotina acumulativa foi executada às
21:33. A nova fotografia continha 50.168 casos. O envio aplicou:

- 4.979 matrículas novas ou alteradas;
- 8.545 casos novos;
- 13.876 reativações de casos que reapareceram;
- 9.147 casos ativos alterados;
- 25.965 casos ativos ausentes preservados, sem desativação.

O backup anterior ao envio é
`backups/backup_supabase_20260929_004327.json.gz`. A verificação final encontrou
zero matrículas ou casos pendentes e confirmou os 25.965 ausentes mantidos. O
estado final possui 76.133 casos ativos e 219.574 inativos.

As 13.876 reativações podem incluir parte dos casos retirados na carga anterior.
Uma recuperação posterior deve consultar o estado remoto e alterar somente os
IDs ainda inativos; nunca deve reaplicar `ativo=true` indiscriminadamente.
