# Plano futuro de otimização da atualização diária

> Plano de época, não inventário de funcionalidades pendentes atual. Partes do estágio/planejamento e da migração Azure já foram implementadas localmente. Consulte [estado atual](STATUS_ATUAL.md) antes de executar etapas ou assumir que algo ainda precisa ser criado.

## Situação atual

O fluxo oficial continua sendo `ATUALIZAR_BASE_DIARIA.bat`. Ele prepara o
SQLite, compara a carga com todo o estado do Supabase, cria e valida um backup,
envia somente registros diferentes e executa uma verificação final.

O processo é seguro e retomável, mas a comparação ainda lê todo o histórico
remoto. Por isso, mesmo uma atualização com poucas mudanças pode levar alguns
minutos. A reconciliação oficial de 17/09/2026 foi excepcionalmente demorada por
envolver mais de 200 mil matrículas, 155 mil casos e dezenas de milhares de
reativações e desativações.

Este documento registra melhorias futuras. Ele não autoriza substituir o fluxo
atual sem testes e não altera a operação diária vigente.

## Objetivos

- reduzir o tempo das atualizações comuns;
- impedir o uso de um SQLite ainda em geração ou corrompido;
- apresentar um resumo operacional fácil de conferir;
- preservar backup, revisões, histórico e retomada após falhas;
- detectar variações anormais antes de qualquer escrita;
- manter uma auditoria completa periódica como garantia de consistência.

## Fase 1 — segurança e experiência operacional

### Validar a origem antes da preparação

1. Ler tamanho e data de modificação do SQLite.
2. Aguardar um intervalo configurável e ler novamente.
3. Interromper se tamanho ou data ainda estiverem mudando.
4. Executar `PRAGMA quick_check`.
5. Confirmar as tabelas e colunas obrigatórias.
6. Registrar tamanho, data, hash e caminho da origem no log.

### Melhorar o resumo antes da confirmação

Exibir, no mínimo:

```text
Base anterior: 155.176 casos ativos
Base nova:     155.420 casos
Novos:             380
Alterados:          112
Reativados:          15
Desativados:        263
```

O programa deve destacar quedas relevantes, aumento incomum, percentual de
desativação e divergência em relação à última execução bem-sucedida.

### Medir e registrar duração

Salvar no relatório o início, fim e duração de:

- validação da origem;
- preparação local;
- leitura do Supabase;
- comparação;
- backup;
- envio de matrículas;
- envio de casos;
- desativação;
- verificação final.

O terminal deve permanecer aberto em caso de erro e terminar com uma mensagem
inequívoca de sucesso ou interrupção.

## Fase 2 — comparação incremental no Supabase

### Arquitetura proposta

Criar uma sincronização identificada por `sincronizacao_id` e uma área de estágio
no Supabase. O computador enviará primeiro somente as chaves e hashes da carga:

```text
SQLite do dia
    -> caso_id/code + conteudo_hash
    -> estágio da sincronização
    -> comparação executada dentro do PostgreSQL
    -> retorno somente dos registros novos ou diferentes
    -> envio dos dados completos necessários
    -> finalização e desativação dos ausentes
```

Componentes previstos:

- tabela de controle das sincronizações;
- tabela temporária ou permanente de estágio com limpeza controlada;
- RPC para iniciar uma sincronização;
- RPC para comparar hashes e devolver apenas chaves divergentes;
- RPC para finalizar a carga e desativar ausentes;
- estado `iniciada`, `enviando`, `finalizada` ou `falhou`;
- retomada segura usando o mesmo `sincronizacao_id`;
- limpeza automática de estágios antigos já finalizados.

### Regras obrigatórias

- nenhuma revisão ou histórico pode ser excluído;
- a desativação só acontece na finalização confirmada;
- uma carga incompleta nunca pode marcar casos como ausentes;
- chamadas repetidas precisam ser idempotentes;
- o backup continua obrigatório antes da escrita;
- o limite de desativação massiva continua ativo;
- lotes de casos permanecem pequenos para evitar HTTP 500;
- uma auditoria completa deve continuar disponível.

## Fase 3 — validação e ativação

1. Criar a migração SQL sem remover as funções atuais.
2. Implementar o modo incremental como opção, não como padrão.
3. Comparar o resultado antigo e o novo sobre a mesma base.
4. Testar carga sem alterações, pequenas mudanças e alteração massiva.
5. Simular interrupção durante matrículas, casos e finalização.
6. Confirmar que a retomada não duplica nem desativa dados antecipadamente.
7. Medir tempo e volume transferido.
8. Executar uma auditoria completa após o modo incremental.
9. Tornar o novo fluxo padrão somente quando todos os contadores coincidirem.
10. Manter o processo anterior disponível temporariamente para contingência.

## Critérios de aceite

- atualização diária comum concluída preferencialmente em 1 a 3 minutos;
- diferenças finais iguais a zero;
- nenhuma perda de revisões, reservas ou histórico;
- proteção contra arquivo de origem em gravação;
- resumo legível antes da confirmação;
- falha retomável sem intervenção manual no banco;
- logs contendo totais, duração e identificação da carga;
- resultado equivalente ao da auditoria completa.

## Prioridade sugerida

1. estabilidade e integridade do arquivo de origem;
2. resumo e tempos por etapa;
3. alertas de variação anormal;
4. estágio e comparação de hashes no Supabase;
5. testes de interrupção e equivalência;
6. ativação do fluxo incremental otimizado.

