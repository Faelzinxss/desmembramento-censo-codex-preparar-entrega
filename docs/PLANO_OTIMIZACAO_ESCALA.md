# Plano de otimização para aumento de usuários

Atualizado em 21/09/2026.

## Objetivo

Preparar a aplicação para crescimento progressivo até 50 ou mais sessões sem
reduzir a proteção de concorrência da reserva V2.

## Implementado no frontend

- Polling de bloqueios suspenso quando a aba está oculta.
- Polling do monitoramento suspenso quando a aba está oculta.
- Intervalos distribuídos aleatoriamente entre 35 e 50 segundos para evitar
  rajadas de consultas simultâneas.
- Janela mínima de 10 segundos entre atualizações de bloqueios disparadas por
  foco, visibilidade e temporizador.
- Trava contra duas consultas de bloqueios em andamento na mesma aba.
- Fila preparada para consultar apenas as raízes das matrículas dos casos
  visíveis, com fallback para a RPC antiga enquanto a migração não for aplicada.
- Atualização imediata por Realtime somente em `INSERT` e `DELETE` de reservas.
  Renovações (`UPDATE`) são ignoradas para evitar uma consulta multiplicada por
  todas as sessões a cada pulso de 45 segundos.
- Conclusões publicadas como evento mínimo (`caso_id` e responsável), permitindo
  retirar localmente linhas antigas sem recarregar a fila completa em todas as
  sessões.

## Migração SQL preparada

Executar `sql/OTIMIZAR_BLOQUEIOS_PAGINA.sql` no SQL Editor do Supabase.

A nova RPC recebe somente as matrículas dos 15 casos da página e devolve apenas
reservas conflitantes. A função atual permanece disponível para compatibilidade.

Os três campos da auditoria final devem retornar `true`:

- `funcao_ok`
- `acesso_ok`
- `somente_ativas_ok`

## Próximas etapas

1. Publicar e validar as otimizações de leitura de bloqueios.
2. Medir chamadas e tempos por RPC com 10 sessões simultâneas.
3. Repetir com 20 sessões e depois 50 sessões.
4. Avaliar uma RPC atômica para localizar e reservar o próximo caso em uma
   única operação.
5. Avaliar paginação por cursor caso o uso real alcance páginas profundas.

## Indicadores do teste

- Tempo p50, p95 e p99 de `buscar_fila_web` e das RPCs V2.
- Quantidade de chamadas por minuto.
- Erros `57014`, `55P03` e respostas HTTP 500.
- Conexões simultâneas, CPU e Disk IO.
- Reservas rejeitadas por disputa.
- Casos duplicados, revisões históricas indevidas e reservas órfãs devem
  permanecer em zero.

## Decisões de arquitetura

- Não substituir o polling por Realtime sem medição: WAL/Re​altime já aparece
  como consumidor relevante nas estatísticas.
- Não alterar a reserva V2 nem o salvamento idempotente apenas para ganhar
  desempenho.
- Não criar índices sem confirmar a consulta e o plano de execução que seriam
  beneficiados.
