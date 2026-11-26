# Implementação de lotes por analista

> ENCERRADO em 07/09/2026 por decisão operacional. A fila por lotes não deve ser
> ativada e `LOTES_04_ATIVAR_FILA.sql` não deve ser executado. O sistema seguirá
> com filas compartilhadas por município e reserva exclusiva por caso. LOTES_02
> e LOTES_03 chegaram a ser instalados, mas estão vazios e não participam da fila.

## LEIA PRIMEIRO — retomada em outro computador

### Atualização local de 07/09/2026 — confirmação preparada

- CSV das funções reais do Supabase conferido em 07/09. Preserva versões atuais
  de `buscar_fila_web`, reservas e `salvar_revisao_web` com seis argumentos.
- Preparado `LOTES_04_ATIVAR_FILA.sql`, NÃO aplicado: lote ativo tem precedência;
  a distribuição antiga do mesmo recorte deixa de liberar casos extras ao analista;
  fora do piloto ela continua válida. Caso novo ligado a matrícula atribuída fica
  bloqueado para triagem. Resumo, contagem e fila usam a mesma autorização.
- Tela do analista mostra seus lotes, saldos e ação "Continuar lote".
- `LOTES_04_REVERTER_FILA.sql` restaura exatamente as cinco funções exportadas
  antes da ativação e preserva todos os dados. Ativação e reversão testadas localmente.
- Backup operacional atualizado e validado: `backup_supabase_20260907_125819.json.gz`
  (4 revisões, 4 perfis, 0 distribuições, 4 contas). É backup operacional parcial.
- LOTES_02, 03 e 04 continuam NÃO aplicadas; site ainda não publicado.

- Etapa anterior salva no commit local `fb612f6`.
- Preparado `sql/LOTES_03_CONFIRMAR.sql`, NÃO aplicado: operação idempotente e
  transacional, restrita a admin ativo. Revalida snapshot, analistas, casos,
  matrículas, recorte, revisões, reservas e vínculos antes de qualquer atribuição.
  Mudança em um grupo reverte a operação inteira. Registra lotes e eventos.
- Tela agora solicita nome da entrega e chama a confirmação após aviso explícito.
  Mensagens para sucesso, expiração, conflito e RPC ainda não instalada.
- Preparado `sql/DESATIVAR_LOTES.sql`: revoga as três operações do navegador e
  preserva dados/históricos, para desativação emergencial sem exclusões.
- Passaram 21 testes Node e 12 verificações SQL locais no PGlite, inclusive acesso
  negado, idempotência, rollback por reserva nova e grupo ausente do snapshot.
  Build aprovado. Fluxo sintético no navegador terminou com "3 casos em 2 lotes".
- LOTES_02 e LOTES_03 continuam NÃO aplicadas no Supabase; nenhum deploy/push.
- Antes de aplicar: novo backup (o anterior é de 04/09), executar LOTES_02 e depois
  LOTES_03 inteiros. Validar via PostgREST. A fila ainda não usa lotes; não publicar
  até preparar e testar a precedência lote/distribuição legada no banco real.

### Requisito confirmado pelo usuário: alterar a equipe após a divisão

Permitir incluir um analista, substituir um responsável ou redistribuir parte
das pendências depois de confirmar a divisão do município. Ainda NÃO implementado.

- Supervisor escolhe a alteração, confere uma prévia das transferências e confirma.
- Redistribuição explícita: não mover casos automaticamente ao incluir uma pessoa.
- Transferir somente pendências sem reserva vigente, mantendo grupos de matrículas
  relacionadas juntos. Se o grupo não puder ser transferido com segurança, bloquear
  e explicar o motivo; não dividir o grupo para contornar o impedimento.
- Preservar avaliações concluídas e autoria original. Registrar origem, destino,
  supervisor e data das transferências; atualizar responsabilidade e fila atomicamente.
- Revalidar permissões, reservas e vínculos no banco na confirmação, incluindo
  concorrência com outras transferências e avaliações. Integrar à etapa 6 do plano.

### Atualização local de 04/09/2026 — prevalece sobre o histórico abaixo

- Tela integrada ao código local: menu admin "Prévia de lotes", seleção de
  município/tipo/similaridade e analistas ativos, progresso, cancelamento,
  resumo por analista, grupos impedidos, expiração e descarte ao mudar filtros.
  Confirmação desabilitada explicitamente; nenhuma RPC de atribuição é chamada.
- Build aprovado, incluindo bundle do Worker; 18 testes Node passaram.
  Teste no navegador com fixture sintética `tests/previa-ui.html`: cálculo real
  no Worker, totais 4/3/1, divisão 2/1, conflito de reserva, confirmação desabilitada
  e descarte da prévia ao mudar similaridade conferidos. Sem conexão remota.
- LOTES_02 continua NÃO aplicada; falta testar banco/API reais e implementar
  confirmação transacional. Nenhum deploy/push realizado. A tela explica
  indisponibilidade se as RPCs de prévia ainda não existirem no ambiente.

- Otimização mais recente: formato compacto v2 em LOTES_02 (NÃO aplicada),
  páginas de 5.000 casos, decodificação validada em formatoSnapshot.js. Todos os
  casos ativos permanecem presentes para preservar os componentes conectados.
- Validação atual: 18 testes Node + 10 verificações SQL locais no PGlite 0.5.8.
  Cliente real ligado às RPCs locais também conferido, sem PostgREST/rede.
- 139.940 casos sintéticos: 11,06 MB/28 páginas, antes 28,69 MB/280 páginas.
  Cerca de 61% menos bytes JSON e 90% menos chamadas de leitura; criação 1,082 s,
  leitura/decodificação 0,400 s, cálculo 0,252 s em teste local. Internet não medida.
- Próximo: integração da tela e validação de resposta/latência no PostgREST;
  confirmação transacional e concorrência real continuam pendentes. Nada publicado.

- Validação posterior concluída LOCALMENTE: 10 verificações SQL no PGlite com
  dados sintéticos passaram, além dos 16 testes Node. Script:
  `tests/validar-snapshot-sql.mjs`. LOTES_02 continua NÃO aplicada no Supabase.
- Screenshot das contagens reais: 140.706 casos totais, 139.940 ativos, zero
  similaridades ausentes/inválidas, identificações vazias, reservas vigentes,
  lotes ou vínculos. Isso representa o momento da consulta, não uma reserva.
- Ensaio local com 139.940 casos: criação 1,761 s, leitura 0,638 s, motor 0,227 s.
  Transferência de cerca de 28,7 MB/280 páginas é custo relevante para internet.
  Antes da tela, resolver/medir esse custo; concorrência real e Supabase pendentes.
  Evidências e limitações em `sql/VALIDAR_SNAPSHOT_LOTES.md`.

- CSV `Supabase Snippet Untitled query.csv` conferido: colunas/tipos e índices
  necessários presentes; quatro tabelas LOTES_01 com RLS e SELECT/INSERT negados
  a authenticated; tabelas de snapshot ainda ausentes. Isso não testa RPCs/RLS.
- `casos` tem estimativa de 140.706 linhas (não é contagem de ativos).
  `similaridade` é real e aceita NULL; o motor atual rejeita esse valor.
  Preparada consulta somente leitura `sql/CONFERIR_DADOS_PREVIA_LOTES.sql`
  para medir ativos, dados incompatíveis, reservas vigentes e vínculos existentes.
- Usuário enviou screenshot de backup concluído e íntegro. O script cobre apenas
  revisoes/perfis/distribuicoes e metadados de auth; não é backup integral do banco.

- Preparado `sql/LOTES_02_SNAPSHOT.sql`, NÃO aplicado: cache temporário paginado
  de todos os casos ativos, com estados calculados numa única instrução SQL.
  RPCs exclusivas de admin ativo; páginas acessíveis somente ao criador.
- Um snapshot por administrador, validade de 20 minutos; criar outro substitui
  o anterior. Expirados são removidos na próxima criação. Nenhum lote é criado.
- Preparados `carregarSnapshot.js`, `prepararPrevia.js` e `previa.worker.js`:
  carregamento validado e cálculo fora da thread da interface. Ainda sem tela.
- Passaram 16 testes Node (motor e cliente com servidor simulado). Esses testes
  NÃO comprovam execução SQL, RLS nem concorrência no PostgreSQL.
- Não há servidor PostgreSQL/psql instalado; foi possível validar com PGlite
  temporário fora do projeto. Testes de conexões concorrentes, PostgREST e
  Supabase real continuam pendentes conforme `sql/VALIDAR_SNAPSHOT_LOTES.md`.
- Confirmação transacional, fila, transferências e piloto continuam pendentes.
  Não ativar lotes nem repetir LOTES_01. Distribuição existente preservada.
- Encontrado também `sql/migracoes_aplicadas/MIGRACAO_WEB_SUPABASE.sql` com apenas
  dois caracteres (`fe`). Preservado; não usar esse histórico como schema real.
- Alterações anteriores e arquivos não rastreados foram preservados. Esta etapa
  não executou SQL remoto, não publicou e não enviou commits ao GitHub.

Este documento registra o contexto da conversa anterior, que pode não estar
disponível neste computador. Leia este arquivo inteiro e MAPEAMENTO_LOTES.md
antes de continuar. Se o usuário pedir somente para ler, apenas leia e confirme
o entendimento; não edite arquivos nem execute migrações sem pedido para avançar.

### Estado confirmado na saída do computador anterior

- Código de implementação enviado ao GitHub até o commit 2bb9d7a.
- O usuário JÁ EXECUTOU sql/LOTES_01_ESTRUTURA.sql no Supabase. O resultado
  mostrou as quatro tabelas com RLS=true, leitura_app=false e escrita_app=false.
  NÃO repetir essa migração. Os lotes ainda não estão ativados na aplicação.
- Motor isolado em src/lotes/gerarPrevia.js, com 9 testes aprovados em
  tests/lotes.test.js, incluindo 10 mil casos sintéticos. Rodar com
  `node tests/lotes.test.js`. Ainda não integrado à tela nem ao Supabase.
- A distribuição atual por recortes continua em uso e deve ser preservada.
- Próximo trabalho: consulta completa e consistente, autorizada para supervisor,
  dos dados necessários à prévia; depois tela e confirmação transacional.
  Não usar somente a página visível da fila nem confiar na prévia do navegador
  para autorizar gravações. Revalidar reservas, vínculos e permissões no banco.
- Integração, testes de concorrência/RLS e piloto ainda NÃO foram concluídos.
- O arquivo local sql/AUDITAR_ESTRUTURA_LOTES.sql foi encontrado esvaziado por
  uma alteração externa ao trabalho do agente. Foi preservado e não incluído
  nos commits. A versão original está no Git; não restaurar sem solicitação.

### Cuidados ao trocar de computador

- Se for outra cópia do repositório, verificar alterações locais antes de atualizar
  pelo Git. Nunca sobrescrever mudanças existentes para alinhar a cópia.
- Credenciais e arquivos locais ignorados pelo Git podem precisar de configuração;
  não imprimir segredos nem incluí-los em commits.
- Não trabalhar simultaneamente nos dois computadores na mesma pasta.
- Atualizar este plano ao encerrar, distinguindo código preparado, testes feitos,
  SQL aplicado pelo usuário e funcionalidade efetivamente ativada.

Pedido curto para o próximo atendimento: **Leia PLANO_LOTES.md, começando pela
seção LEIA PRIMEIRO, e MAPEAMENTO_LOTES.md. Por enquanto, apenas leia.**

Status: estrutura inativa aplicada pelo usuário e confirmada por screenshot (RLS=true, leitura/escrita app=false). Motor puro de prévia implementado; 9 testes locais passaram. Integração Supabase, tela e confirmação ainda pendentes. Funcionalidade ainda não ativada.
Data: 03/09/2026.

## Decisão aprovada

O supervisor escolhe município, tipo, similaridade e analistas. O sistema propõe
lotes equilibrados por quantidade de casos, preservando grupos de matrículas
relacionadas. O supervisor revisa e confirma. Não é necessário selecionar cada
caso manualmente. Caixinhas para ajustes são uma evolução opcional.

- A–B, A–C e C–D pertencem ao mesmo grupo conectado.
- A composição confirmada é fixa; casos novos não entram silenciosamente.
- Não duplicar casos, matrículas nem revisões para formar lotes.
- Um caso não pode pertencer a dois lotes ativos.
- Matrículas relacionadas não podem ser atribuídas a pessoas diferentes.
- Equilíbrio é por número de casos, não por esforço estimado. Grupos grandes
  podem produzir lotes desiguais e devem aparecer como aviso na prévia.
- Relações fora do município/tipo escolhido devem ser verificadas: bloquear e
  explicar conflitos, sem ampliar o recorte automaticamente.
- Novos casos relacionados a matrículas atribuídas ficam sinalizados para
  decisão do supervisor; nunca encaminhar automaticamente a outra pessoa.
- Transferir pendências preserva a autoria das avaliações concluídas e não
  movimenta casos com reserva vigente.

## Ordem de implementação

### 1. Mapear o fluxo existente (concluído com CSV remoto)

- Inspecionar src/main.jsx, sincronizar_supabase_web.py e SQLs das distribuições,
  fila, reservas, revisões, produtividade e políticas de acesso.
- Identificar funções SQL efetivamente implantadas, sem presumir que arquivos
  históricos representam o banco atual.
- Definir como distribuições antigas coexistem com lotes durante a transição.
- Registrar os pontos de integração antes de mudar o schema.

### 2. Preparar modelo e migração aditiva

Primeira entrega: LOTES_01_ESTRUTURA.sql cria somente tabelas bloqueadas para o
navegador. Não executar novamente após sucesso. Falha antes do commit reverte a
transação inteira. Confirmação/RPCs/concorrência e testes ainda pendentes.
Não preencher tabelas manualmente nem ativar lotes nesta fase.

- Propor tabelas mínimas de lotes, associação caso–lote e histórico de transferências.
- Definir integridade, índices, RLS e permissões: supervisor gerencia; analista
  acessa somente o que lhe foi atribuído. Não confiar só na interface.
- Confirmação deve ser transacional e validar conflitos entre casos e matrículas,
  inclusive se dois supervisores confirmarem simultaneamente.
- Não apagar distribuições nem revisões existentes. Preparar reversão segura
  para desativar o recurso sem perder histórico.
- Medir armazenamento e plano de execução com volume representativo.
- Entregar SQL revisado para execução pelo usuário, com backup anterior.

### 3. Gerador de prévia

Implementação parcial: src/lotes/gerarPrevia.js, testada com
`node tests/lotes.test.js` (9 testes, incluindo 10 mil casos sintéticos).
Sem consultas, persistência ou ligação com a tela. snapshotCompleto é um contrato
do chamador, não prova de completude: implementar exportação paginada consistente
no servidor antes de usar. Flags revisado/reservado/atribuido devem ser calculadas
no servidor; não confiar em flags do navegador na confirmação.
Próxima etapa: obter snapshot completo autorizado para o supervisor, com proteção
contra alterações durante paginação, e definir execução do cálculo fora da UI.
Depois conectar a prévia e implementar confirmação transacional revalidada.
Matrículas com vínculos sem casos ativos também devem entrar na informação de
propriedade fornecida pelo servidor; o motor não descobre esses vínculos sozinho.

- Construir componentes conectados pelas matrículas, verificando relações fora
  do recorte e atribuições existentes.
- Considerar somente pendências elegíveis e não reservadas para atribuição.
- Ordenar grupos por tamanho decrescente; atribuir cada grupo ao analista com
  menor carga prevista, com desempate determinístico.
- Calcular fora das consultas de navegação. Escolher execução apropriada após
  medir o custo; não pressupor processamento pesado no Worker estático.
- Exibir totais, grupos grandes, conflitos e saldo não distribuído.
- Revalidar elegibilidade na confirmação; prévia não é reserva definitiva.

### 4. Confirmação e tela do supervisor

- Seleção de recorte e participantes → prévia → confirmação única.
- Evitar duplicação por clique repetido/reenvio.
- Exibir município, lote, responsável, total, concluídos, restantes e sem lote.
- Especificar contagens sem dupla contagem nos casos com dois municípios.

### 5. Fila do analista e reservas

- Mostrar lotes próprios e ação Continuar lote.
- Integrar próximo caso, abertura dos links, conclusão e cancelamento.
- Validar autorização e reserva no banco; não apenas filtrar a lista no React.
- Preservar trabalhos já abertos durante ativação do recurso.

### 6. Sincronização e transferências

- Manter vínculos dos lotes quando o sincronizador atualizar casos.
- Diferenciar desativados de concluídos nos saldos.
- Sinalizar novos casos relacionados e conflitos que conectem lotes existentes.
- Transferir apenas pendências elegíveis, atomicamente, registrando origem,
  destino, supervisor e data. Manter autoria original das conclusões.

### 7. Testes e piloto

- Grupos A–B/A–C/C–D; grupo maior que o lote ideal; recorte vazio.
- Relações cruzando município/tipo e novas relações entre lotes existentes.
- Confirmação simultânea, reenvio, reserva vigente e transferência concorrente.
- Acesso indevido por outro analista e usuário desativado.
- Sincronização, inativação, revisões preservadas e saldos consistentes.
- Medir tempo, consultas e espaço antes/depois; testar restauração de backup.
- Piloto pequeno; só então ampliar. Manter rotina atual até validar o piloto.

## Contexto para retomar

- Banco medido em 331 MB; sem urgência de limpeza na auditoria enviada pelo usuário.
- Frontend estático no Cloudflare; dados e autorização no Supabase.
- Município da coluna tratada 1.4 Município_field; não adicionar normalização nova.
- Rotina de dados: preparar → simular → sincronizar → conferir simulação.
- Código já publicado inclui correção de perfil ao voltar à aba (cd30fe3).
- Este documento não significa que lotes foram criados ou que a migração foi aplicada.

Prompt para continuar: "Continue PLANO_LOTES.md pela etapa 1. Inspecione o fluxo
atual, proponha a migração aditiva e avance por etapas preservando a distribuição
existente. Registre o que foi implementado, testado e o que falta ao encerrar."
