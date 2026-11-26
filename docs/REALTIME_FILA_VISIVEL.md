# Teste local de Realtime na fila — 09/11/2026

Em 12 minutos de uso normal houve 118 inserções e 119 exclusões de reservas e 112 inserções de eventos de conclusão. São 349 alterações candidatas à entrega em cada aba da fila; não são mensagens faturadas. O frontend local não assina atualizações de renovação. A origem exata do total faturado permanece sem confirmação.

## Mudança

A fila se inscreve enquanto a aba está visível. Ao ocultar, os callbacks anteriores são invalidados e o canal é removido. Ao voltar, a fila consulta bloqueios e reconcilia os pendentes usando as rotinas e limites existentes; a assinatura também solicita conferência após a confirmação da conexão. Intervalos de consulta permanecem iguais. Notificações, prioridades, RPCs de reserva, duração, renovação e permissões permanecem iguais.

## Continuidade

Cópia de teste `codex/realtime-fila-visivel` baseada em `origin/main` no commit `f3da4b7`. As alterações anteriores da pasta operacional foram preservadas. Nenhum SQL, deploy, alteração de cobrança ou teste com dados de produção.

Validação local: 31 testes Node aprovados (3 de visibilidade, 27 de reserva e 1 integração de dois clientes), build aprovado com configuração fictícia e aviso conhecido de bundle acima de 500 kB. A branch permanece local enquanto não se confirmar a política externa de publicação do Cloudflare.

Sem projeto de homologação disponível, o teste de integração usou o SDK real do aplicativo com transporte Phoenix simulado em memória. Duas sessões visíveis receberam duas entregas por evento; ao ocultar uma, houve uma entrega e nenhum callback nela. Ao voltar, ela reconferiu a reserva e a conclusão ocorridas enquanto estava oculta. O teste impede acesso HTTP e não comprova autenticação, entrega ou faturamento no Supabase real.

Próximo passo: revisar e autorizar a publicação separadamente, após identificar a versão de produção e confirmar como o Cloudflare publica branches. Após publicação, verificar fila com usuários reais no trabalho normal e comparar mensagens Realtime e chamadas das RPCs por intervalo equivalente antes e depois. Não criar avaliações falsas em produção. Se surgir regressão, reverter o frontend ao commit anterior; não há SQL para reverter.
