# Próximos passos

Atualizado em 07/09/2026.

## Decisão operacional vigente

- Manter a distribuição por município/tipo/similaridade já existente.
- Permitir que vários analistas recebam o mesmo município.
- O primeiro que abrir um caso mantém uma reserva exclusiva de 30 minutos.
- Enquanto a análise permanece aberta, o navegador renova a reserva a cada 5 minutos e ao voltar para a aba.
- O analista pode alternar a lista entre disponíveis, em análise e concluídos; a lista em análise mostra responsável e etapa.
- A fila dos demais ignora o caso reservado e o avanço automático procura o próximo disponível.
- A proposta de divisão por lotes foi encerrada antes da ativação da fila. `LOTES_04` não deve ser executado.
- `LOTES_02` e `LOTES_03` foram instalados vazios e podem ser removidos com `REMOVER_ESTRUTURA_LOTES_INATIVA.sql`.

## Concluído

- Município da coluna tratada `1.4 Município_field`, compartilhado entre matrícula e caso.
- Status do Backoffice, consulta dos dois links e avanço ao próximo caso.
- Distribuição com todos os recortes visíveis por analista.
- Filtros de município, tipo e similaridade com aplicação explícita e contagem.
- Decisões, matrícula movida e novo Código Deep; produtividade diária.
- Responsividade, otimizações, sincronização incremental e backup.
- Atualização diária em um único BAT: prepara, simula, confirma, faz backup, envia, verifica e registra relatório.
- Remoção das tabelas legadas vazias e do índice duplicado.
- Correção extraordinária dos municípios; BATs pontuais retirados da rotina.

## Pendências reais

1. Aplicar `CORRIGIR_CONTAGENS_DISTRIBUICAO.sql` para o resumo e a paginação mostrarem somente o recorte autorizado.
2. Validar a próxima sincronização normal: alterações em outros campos ainda podem aparecer após a correção extraordinária.
3. Fazer piloto com dois perfis reais, verificando reserva simultânea, decisão e avanço automático.
4. Testar restauração do backup em ambiente separado.
5. Definir frequência de backups e acompanhamento do tamanho do banco.
6. Planejar migração para SQL Server quando a infraestrutura estiver definida.

## Ideias opcionais ainda não implementadas

- Filtros de produtividade por município, tipo e decisão, além da seleção diária.
- Indicadores por hora e opção de desligar o avanço automático.
- Agendamento da sincronização, após estabilizar a rotina manual.

O fluxo de rotina e a publicação do site estão documentados em `README.md`.

Auditoria do banco já executada: 331 MB, sem necessidade urgente de limpeza.
Candidatos à exclusão permanecem preservados; não executar limpeza automática.
