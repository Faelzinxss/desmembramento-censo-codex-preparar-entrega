# Evolução do fluxo de conferentes

Atualizado em 15/09/2026. Este documento controla a mudança do modelo de
distribuições para uma fila livre monitorada.

## Decisões confirmadas

- O cargo operacional passará de `analista` para `conferente`.
- Conferentes poderão escolher livremente município, tipo, similaridade e etapa.
- Distribuições deixarão de limitar a fila.
- A reserva exclusiva por caso continuará impedindo trabalho duplicado.
- A antiga tela de distribuições se tornará um monitoramento de atividade.
- Cada conferente verá a própria produtividade, independentemente dos filtros.
- A solução deve suportar mais de 50 pessoas.

## Etapas

### 1. Complemento e galeria de fotos — carga concluída

- [x] Confirmar os campos na base oficial.
- [x] Ler `1.8.1 Complemento_field`.
- [x] Preservar separadamente a foto da estrutura.
- [x] Preparar carrossel com setas e indicadores.
- [x] Manter compatibilidade com matrículas que possuem somente uma foto.
- [x] Executar `sql/ADICIONAR_COMPLEMENTO_E_FOTO_ESTRUTURA.sql` no Supabase.
- [x] Simular a sincronização e conferir o volume de matrículas alteradas.
- [x] Executar a sincronização real após conferência.
- [ ] Validar casos com uma e duas fotos no site publicado.

Simulação de 14/09/2026: 207.855 matrículas na origem; 64.249 com complemento;
193.210 com foto de estrutura; 198.478 com pelo menos um campo novo. O envio foi
bloqueado porque a base oficial também exige uma reconciliação de 100.489 casos e
71.646 desativações (51,2%). Não forçar no plano Free.

Reconciliação oficial concluída em 16/09/2026 após o upgrade para o Pro. A fonte
vigente gerou 133.468 matrículas e 97.403 casos; foram enviados 127.488 registros
de matrículas e 66.214 registros de casos, com 93.546 desativações lógicas
confirmadas pelo responsável. A verificação final retornou zero alteração e zero
desativação pendente. Revisões, históricos e perfis foram preservados.

As 7 revisões e 2 versões históricas existentes foram confirmadas como testes.
A limpeza controlada em `sql/INICIAR_OPERACAO_LIMPA.sql` está bloqueada porque a
origem de 16/09/2026 pode ter sido gerada de forma incompleta. Não remover casos
inativos nem matrículas órfãs antes de processar novamente a base corrigida,
reconciliar e validar os novos totais. Seguir `docs/RECEBER_BASE_CORRIGIDA.md`;
a simulação agora separa casos novos, reativados e alterados.

### 2. Produtividade pessoal — concluída

- [x] Criar função que retorna somente a produção do usuário autenticado.
- [x] Apresentar total, dias e tipos de decisão por período.
- [x] Basear toda contagem em `revisoes.usuario_id` e `revisado_em`.
- [x] Preparar índice composto por usuário e data.
- [x] Executar `sql/MINHA_PRODUTIVIDADE.sql` no Supabase.
- [ ] Validar com uma conta operacional.

### 3. Perfil conferente — concluída

- [x] Executar `sql/PERFIL_CONFERENTE.sql` no Supabase.
- [x] Preparar migração dos perfis existentes para `conferente`.
- [x] Atualizar constraint, funções SQL, utilitário de ativação e interface.
- [x] Manter `gestor` e `admin`.
- [x] Publicar o frontend depois de validar a migração.

### 4. Fila livre — concluída

- [x] Executar `sql/ATIVAR_FILA_LIVRE.sql` no Supabase.
- [x] Retirar a exigência de uma distribuição para acessar casos.
- [x] Exibir os filtros completos ao conferente.
- [x] Manter paginação, reservas e validação de acesso no banco.
- [ ] Testar concorrência abrindo o mesmo caso com duas contas.
- [x] Desativar o uso das funções de distribuição sem apagar a tabela.

### 5. Monitoramento — concluída

- [x] Executar `sql/CRIAR_MONITORAMENTO.sql` no Supabase.
- [x] Criar uma linha de atividade por usuário, atualizada por `upsert`.
- [x] Registrar sessão, filtros atuais, caso aberto e última atividade.
- [x] Classificar pessoas como trabalhando, revisando, ausentes ou offline.
- [x] Criar painel e total de ativos para gestores e administradores.
- [x] Expirar atividade por horário, sem acumular eventos desnecessários.
- [x] Manter a equipe em ordem alfabética fixa.
- [x] Detectar saída de atividade em 20 segundos e offline em até 45 segundos.
- [x] Adicionar filtros internos por pessoa, status, município e tipo.

### 6. Encerramento das distribuições — pendente

- Observar o novo fluxo em produção.
- Confirmar que nenhuma função ativa depende de `distribuicoes`.
- Fazer auditoria e backup.
- Somente então decidir pela remoção definitiva da tabela e das RPCs antigas.

### 7. Ajustes operacionais — pendente

- [x] Reduzir o pulso do monitoramento para 10 segundos e a leitura para 5 segundos.
- [x] Criar etapa e filtro específicos para revisões inconclusivas.
- [x] Executar `sql/ADICIONAR_OBSERVACAO_ORIGEM.sql` no Supabase.
- [x] Trazer `Observações_field` da base oficial e exibir depois do complemento.
- [x] Registrar qual matrícula deve ser excluída nas duplicidades: A ou B.
- [x] Exibir Minha produtividade somente para conferentes; supervisores acompanham
  sua eventual produção no painel da equipe.
- [ ] Validar na aplicação uma revisita inconclusiva e uma duplicidade A/B.
- [x] Preservar o histórico de cada reavaliação sem alterar retroativamente a
  produtividade original; manter separadamente o resultado vigente do caso.
  `sql/ADICIONAR_HISTORICO_REAVALIACOES.sql` executado e validado no Supabase.
- [ ] Validar uma reavaliação real e conferir resultado vigente, autoria e
  produtividade das duas pessoas envolvidas.
- [x] Confirmar em backup real que a reavaliação gerou uma linha histórica.
- [x] Executar `sql/AUDITAR_PRONTIDAO_PRODUCAO.sql`: todas as proteções válidas,
  sem revisões órfãs, matrículas ausentes ou perfis inválidos.
- [x] Executar `sql/REDUZIR_TEMPO_RESERVAS.sql` e ajustar a renovação do frontend:
  reserva de 10 minutos renovada a cada 2 minutos.
- [x] Ao salvar uma reavaliação pontual, fechar o modal sem abrir automaticamente
  o próximo caso; manter o avanço automático apenas na produção normal.
- [x] Permitir que cada pessoa ligue ou desligue o avanço automático; preservar
  a preferência por usuário no navegador.

## Ordem para continuar amanhã

1. Validar na aplicação uma revisita inconclusiva e uma duplicidade indicando A/B.
2. Validar a produtividade pessoal com uma conta de conferente.
3. Testar duas contas tentando abrir o mesmo caso ao mesmo tempo.
4. Validar no site publicado complemento, observação e carrossel em casos com uma
   e duas fotos.
5. Após um período estável em produção, auditar e arquivar as RPCs antigas de
   distribuição.

## Regra de continuidade

Ao retomar o trabalho, comece pelo primeiro item ainda desmarcado. Não publique um
frontend que dependa de SQL novo antes de executar e validar a migração correspondente.
