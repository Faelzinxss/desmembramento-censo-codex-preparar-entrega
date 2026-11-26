# Histórico — Estado anterior à revisão documental de 15/10/2026

Os números, incidentes e afirmações de ausência de pendências abaixo são históricos, não uma auditoria atual. Consulte `../STATUS_ATUAL.md`.

Atualizado em 28/09/2026.

## Atualização acumulativa

A atualização diária agora usa a origem como conjunto acumulativo: insere pares
novos, atualiza pares conhecidos, reativa pares que reaparecerem e mantém ativos
os casos que não vierem no arquivo do dia. A desativação por ausência só ocorre
no modo excepcional de reconciliação. Cada simulação salva a lista exata de
ausentes para auditoria e recuperação. O desenho completo está em
`docs/SINCRONIZACAO_ACUMULATIVA.md`.

## Meus trabalhos e reconferência

Em 22/09 foi aplicado no Supabase o script
`sql/RECONFERENCIA_DESMEMBRAMENTOS.sql`; a auditoria final retornou `true` para
checklist, listagem, correção e marcação. O frontend correspondente está na
`main` a partir do commit `6646768`.

A tela **Minha produtividade** agora inclui **Meus trabalhos**, que lista somente
as avaliações do usuário autenticado, permite filtrar por decisão e dia, buscar
por Código Deep e corrigir o próprio trabalho com controle de versão e histórico.
Não existe pendência ou obrigação especial para desmembramentos. A consulta é
paginada em 50 itens, usa índice por usuário/decisão/data e não percorre a fila
operacional.

## Atenção antes de publicar

Em 18/09 houve reavaliações involuntárias sob concorrência. A auditoria encontrou
1.194 versões históricas, das quais 1.183 foram criadas no dia; 1.169 substituições
ocorreram em até cinco minutos. O histórico foi preservado e o relatório detalhado
local está em `backups/auditoria_concorrencia_2026-09-18.csv`.

A correção P0 foi aplicada e auditada no Supabase, publicada na `main` e os contratos
V1 foram bloqueados. Um teste real confirmou que uma primeira análise aumentou
`revisoes` de 1.604 para 1.605, criou uma operação idempotente e manteve o histórico
em 1.194.

O incidente foi recuperado: as primeiras revisões dos 512 casos foram restauradas.
O diagnóstico final encontrou 512/512 casos iguais à versão original em decisão,
autor, horário e demais campos. O histórico operacional ficou vazio para corrigir a
produtividade, e as 1.194 versões acidentais continuam preservadas em
`backup_incidente_20260918_historico`. O estado anterior das 512 revisões está em
`backup_incidente_20260918_revisoes_atuais`. Ambas as tabelas possuem RLS e não são
acessíveis a `anon` ou `authenticated`.

Também existe o backup externo validado
`backups/backup_supabase_20260918_222831.json.gz`, com 1.605 revisões, 1.194 versões
históricas, perfis e usuários. O backup posterior à restauração é
`backups/backup_supabase_20260918_223332.json.gz`, com 1.605 revisões restauradas e
zero históricos operacionais. Não executar novamente os scripts de recuperação.

## Situação do código

- A branch de produção é `main`.
- `main` e `origin/main` estavam alinhadas ao fechar esta etapa; o último registro
  antes da carga era `Documenta retomada e futura fonte SQL Server`.
- O frontend V2 compila com sucesso usando `pnpm run build`.
- A fila é livre para conferentes, com bloqueio de casos, matrículas e raiz da
  visita para impedir trabalho simultâneo sobre o mesmo conteúdo.
- A implementação local nova separa reservas por conta e por aba, exige token para
  renovar/liberar/salvar e impede que a primeira análise substitua uma revisão.
- Cada carregamento recebe um identificador de aba próprio. Isso fecha a brecha em
  que o navegador copiava o `sessionStorage` ao duplicar uma aba.
- Conferentes fazem somente a primeira avaliação. A ação `Revisar` é restrita a
  gestores e administradores e aparece visualmente como correção supervisionada.
- O aplicativo possui fila, reavaliação com histórico, produtividade pessoal e da
  equipe, monitoramento, filtros, fotos e acesso integrado ao Backoffice.

## Estado da base em produção

A base oficial sincronizada em 19/09/2026 contém:

- 217.952 registros de origem;
- 199.625 matrículas únicas carregadas;
- 139.642 casos ativos no escopo operacional;
- aproximadamente 242,3 MB de payload JSON.

A atualização da base oficial das 17h enviou 7.183 matrículas novas ou alteradas,
4.414 casos novos ou alterados e desativou logicamente 555 casos ausentes na nova
origem. A auditoria automática executada depois do envio encontrou:

- 0 matrículas novas ou alteradas;
- 0 casos novos, alterados ou a reativar;
- 0 casos ativos a desativar.

Em 19/09 foi corrigida a persistência de `Observações_field`: o importador lia o
campo certo, mas não o incluía no `INSERT/UPDATE` da base preparada. A origem tem
109.667 linhas preenchidas e a fila preparada passou a ter 96.049 casos com ao
menos uma observação. A carga incremental enviou 102.856 matrículas e 2.108 casos,
desativou logicamente 367 casos ausentes e preservou as 1.605 revisões. O backup
anterior ao envio é `backups/backup_supabase_20260919_134158.json.gz`.

A conferência posterior encontrou zero matrículas, casos, reativações ou
desativações pendentes. Portanto, o Supabase está conciliado com o SQLite oficial
modificado em 18/09/2026 às 19:13:05.

## Correção aplicada após a carga

O sincronizador passou a ler o Supabase por paginação baseada na última chave, em
vez de usar deslocamentos crescentes. O envio de casos também foi reduzido para
lotes de 50 registros. Isso evita os timeouts HTTP 500 observados com a base maior.

## Ordem executada para concluir a correção

1. `sql/CONCORRENCIA_SEGURA_V2.sql` aplicado e auditado.
2. Frontend V2 publicado na `main`.
3. Primeira análise real salva sem aumentar o histórico.
4. Contratos V1 sem permissão de execução para usuários autenticados.
5. 512 casos do incidente restaurados e conferidos; evidências preservadas.
6. Pendente: ampliar o ensaio gradualmente. Não declarar capacidade para 50 pessoas
   sem medir 10, 20, 30 e 50 sessões.

## Como continuar no computador da empresa

1. Execute `git pull --ff-only origin main`.
2. Confirme que a branch local está alinhada com `origin/main`.
3. Verifique este arquivo e o plano de concorrência antes de publicar qualquer coisa.
4. Nas próximas cargas, use somente `ATUALIZAR_BASE_DIARIA.bat` com o SQLite da
   pasta oficial já finalizado.
5. Confira a simulação antes de digitar `ATUALIZAR`.
6. Se a simulação terminar com zero diferenças, encerre sem novo envio.

O trabalho prioritário agora é medir 10, 20, 30 e 50 sessões e observar tempo de
fila, timeouts e Disk IO. A otimização incremental da atualização fica depois dessa
validação operacional.

## Otimização de telas aplicada em 19/09

A auditoria de consultas está em `docs/AUDITORIA_CONSULTAS_TELAS.md`. O frontend
reduz chamadas repetidas de filtros e monitoramento. O SQL
`sql/OTIMIZAR_TELAS_RELATORIOS.sql` cria resumos incrementais para produtividade e
pendências, torna o resumo global da fila constante e adiciona cache curto aos
recortes filtrados. O SQL foi executado em produção e as 11 verificações finais
retornaram `true`, incluindo a conciliação exata de produtividade e pendências.
Não executar novamente sem uma nova migração que exija reconstruir esses resumos.

## Ponto exato de retomada

Não existe migração SQL, correção de dados ou envio ao Git pendente. Ao abrir o
projeto em outro computador:

```text
git switch main
git pull --ff-only origin main
git status
```

O `git status` deve informar que não há alterações locais. Não executar novamente:

- scripts de recuperação do incidente de 18/09;
- `sql/CONCORRENCIA_SEGURA_V2.sql`;
- `sql/ENCERRAR_CONTRATOS_FILA_V1.sql`;
- `sql/RESTRINGIR_REAVALIACAO_SUPERVISORES.sql`;
- `sql/OTIMIZAR_TELAS_RELATORIOS.sql`.

Produção está com 199.625 matrículas únicas carregadas, 139.642 casos ativos,
1.605 revisões e zero
diferenças pendentes na última conciliação. As 11 verificações da otimização das
telas retornaram `true`.

## Próximas tarefas

1. Fazer ensaio progressivo com 10, 20, 30 e 50 sessões, sem pular etapas.
2. Em cada etapa medir tempo da fila, reserva, salvamento, erros `57014`, `55P03`,
   HTTP 500, conexões e Disk IO. Sustentar a etapa por tempo suficiente para não
   medir somente o burst inicial do Micro.
3. Confirmar que primeiras avaliações não aumentam `revisoes_historico` e que duas
   abas da mesma conta não conseguem manter duas análises simultâneas.
4. Se 50 sessões não atingirem as metas, implementar a seleção atômica do próximo
   caso por cursor descrita em `docs/PLANO_SOL_CONCORRENCIA_E_DESEMPENHO.md` e
   repetir o ensaio. Essa evolução não é necessária antes de existir evidência de
   gargalo.
5. Nas atualizações diárias, executar `ATUALIZAR_BASE_DIARIA.bat` somente quando o
   SQLite oficial tiver mudado. A rotina já faz simulação, backup, envio incremental
   e verificação final.

Melhorias opcionais, sem bloquear a operação atual: configurar SMTP próprio para
convites em volume e definir uma política de retenção para as tabelas de evidência
do incidente depois que a equipe encerrar a auditoria.

## Regra de duplicidades aplicada em 19/09

A rotina de preparação agora mantém na fila somente casos de `Possível imóvel
duplicado` com similaridade maior ou igual a 80%. A aplicação desativou logicamente
19.881 duplicidades abaixo do corte; em Capão Bonito foram 259 e permaneceram 579
duplicidades elegíveis. Revisões existentes foram preservadas e os totais de
pendências por município foram reconstruídos. Os outros tipos permanecem sem corte
de similaridade.

O backup anterior à aplicação é
`backups/backup_supabase_20260919_143247.json.gz`. A conciliação posterior encontrou
zero matrículas ou casos novos/alterados, zero reativações e zero desativações
pendentes.

## Ampliação do corte e atualização de fila em 21/09

O mesmo corte de similaridade maior ou igual a 80% passou a valer para `Revisão
visual recomendada`. A aplicação direta, sem reprocessar a fonte, deixou 148.670
casos desse tipo fora da fila e manteve 13.221 ativos com 80% ou mais. Nenhuma
desativação foi adiada por reserva ativa. As revisões existentes foram preservadas
e os resumos operacionais foram reconstruídos. A rotina de preparação também foi
alterada para manter a regra nas próximas atualizações.

A fila agora recebe eventos mínimos de conclusão e remove localmente casos
finalizados por outra pessoa, sem exigir cliques de tentativa nem recarregar a fila
completa em todas as sessões. As reservas continuam usando Realtime somente em
abertura e encerramento; renovações periódicas não provocam consultas coletivas.
Os filtros aplicados na fila ficam salvos localmente por usuário e são restaurados
antes da primeira consulta após atualizar a página.

## Atualização da base oficial em 21/09

O SQLite oficial modificado em 21/09/2026 às 16:54 foi processado com as regras
atuais. A origem contém 223.634 registros e gerou 65.381 casos no escopo; 98.358
casos de duplicidade ou revisão visual abaixo de 80% ficaram fora da fila.

A simulação e o envio incremental registraram:

- 3.038 matrículas novas e 2.550 alteradas;
- 2.257 casos novos, 92 reativados e 309 alterados;
- 268 casos antigos desativados logicamente.

O backup íntegro anterior ao envio é
`backups/backup_supabase_20260921_231236.json.gz`, com 3.501 revisões, 14 perfis e
14 usuários. O envio terminou sem erro em 6,7 minutos e a conciliação posterior
retornou zero diferenças em todas as categorias.
