# Avanço automático da fila

Diagnóstico de 09/11/2026. A coleta temporária em produção foi ativada às 17h25min56s, horário de São Paulo, e se desativa após 12 minutos. Ela registra a chave do recorte e o deslocamento, amostra 20% dos avisos de cache ocupado e registra renovações que terminam em pelo menos um segundo. Não registra identificadores de usuários ou casos. Os marcadores `fila_diag_20261109` na função identificam os blocos temporários.

As primeiras cinco renovações lentas corresponderam a dois recortes de pendentes de possível imóvel duplicado em Angatuba. A página 2 com similaridade mínima de 80 levou de 8,7 a 12,5 segundos. A página 1 sem similaridade mínima levou de 12,0 a 13,4 segundos. Para a seleção dos IDs da página 2, a consulta atual expirou em um teste limitado a cinco segundos. A alternativa que materializa o recorte municipal usou os índices existentes de município e terminou em 218 ms em uma execução de leitura. Esse tempo mede a seleção dos IDs, não a chamada completa.

Os scripts `sql/OTIMIZAR_FILA_PENDENTE_MUNICIPIO.sql` e `sql/REVERTER_FILA_PENDENTE_MUNICIPIO.sql` isolam a mudança à busca de pendentes com município selecionado. O teste em PostgreSQL local com dados sintéticos confirmou oito recortes equivalentes antes e depois, incluindo paginação, exclusão de reservas vigentes e reversão. A otimização foi aplicada e confirmada em produção às 17h31min41s de 09/11/2026, horário de São Paulo. Duas chamadas diretas de leitura após a instalação retornaram 15 casos cada: 100 ms na página 2 de Angatuba com mínimo de 80 e 84 ms na página 1 sem similaridade mínima. Os tempos não incluem cache, rede ou renderização. O comportamento sob uso simultâneo precisa ser acompanhado nos logs após a mudança.

Após a publicação inicial, os 50 erros visíveis no painel PostgreSQL entre 17h10m06s e 17h11m23s eram `PZ001`. A amostra não conta usuários ou buscas lógicas. O aplicativo agora compartilha buscas idênticas que ainda estão em andamento na mesma aba e espaça as duas tentativas de cache ocupado em 1 a 1,5 s e 2,5 a 3 s. O número máximo de chamadas por busca segue em três. Essa mitigação não reduz o custo da consulta no PostgreSQL. Para investigar os timeouts, cruzar `57014` com a operação registrada na API e examinar o plano para o filtro e deslocamento afetados.

Produção: migração confirmada no Supabase e versão Cloudflare `27277a74-bf65-4b32-aef9-bda66fa1907e` publicada a 100%. O endereço de produção respondeu HTTP 200 e serviu o pacote com o identificador `fila-cache-v1`. A versão anterior é `446fa710-1be7-40e8-87b8-7da4020d523a`.

O SQL aplicado pelo editor usou comparação do trecho com espaços flexíveis para acomodar o formato CRLF da função instalada. Ele verificou a unicidade do trecho e preservou as permissões. O arquivo de reversão da branch pressupõe a formatação original da migração local. Para reverter a versão aplicada pelo editor, primeiro adapte a verificação ao trecho efetivamente instalado e confira o resultado no catálogo. O ensaio operacional da fila com usuário autenticado ainda deve ser feito durante o uso normal.

Após salvar, a fila tenta os casos seguintes já visíveis e depois consulta o deslocamento atual, pois novos casos podem entrar na página. Se não conseguir reservar nenhum, consulta também a página seguinte. A busca automática não volta à página 1, não repete a tentativa pelo mesmo caso durante o avanço e não solicita reavaliação. Uma falha na busca é exibida separadamente da confirmação do salvamento.

O salvamento deixou de reconsultar as opções de tipo de ocorrência. O filtro continua carregando suas opções na entrada da fila.

Reaplicar os mesmos filtros na primeira página agora repete a busca, inclusive depois de um timeout. Antes, todos os valores de estado podiam permanecer iguais e nenhuma requisição era iniciada.

O teste com dois clientes usa um servidor de reservas simulado para provocar disputa pelo mesmo primeiro candidato. Antes de promover a versão, validar com duas sessões e dados de teste em um ambiente isolado.

A migração `sql/SINALIZAR_CACHE_OCUPADO_FILA.sql` sinaliza `PZ001` somente para a versão do app que sabe tratá-lo. Ela verifica o trecho instalado e mantém a assinatura, as permissões e o cache existente. O app tenta a mesma página até duas vezes, em 250 e 600 ms, somente para esse sinal. Clientes antigos mantêm a resposta anterior. Instalar e testar em ambiente isolado antes de promover em produção. A reversão está em `sql/REVERTER_SINAL_CACHE_OCUPADO_FILA.sql`.

Validação da migração em PostgreSQL local com duas conexões TCP e dados sintéticos. Uma conexão manteve o bloqueio de transação da chave de cache enquanto a outra chamou a função como `authenticated`. Foram verificados o sinal para o cliente novo, a compatibilidade com o anterior, a leitura após liberar o bloqueio, a página realmente vazia, a reversão e o bloqueio do papel `anon`. O ensaio pelo PostgREST em Supabase isolado segue pendente.

Na amostra de 60 minutos dos logs de produção de 09/11/2026, 44 dos 45 erros 5xx da API foram de `buscar_fila_web`, e um foi do resumo. Os primeiros 50 erros exibidos no recorte de Postgres eram cancelamentos por tempo limite.

Uma consulta somente de leitura ao catálogo confirmou que `buscar_fila_web` devolve `[]` se outra transação estiver renovando o mesmo cache e a página de pendentes em cache não for válida. Esse retorno é indistinguível de uma página sem casos. A busca direta usa `OFFSET` e `force_custom_plan`. A configuração instalada registra `statement_timeout=20s` nas duas funções.

Nas estatísticas acumuladas para `authenticated`, a busca registrou 240.328 execuções, com média de 238,7 ms e máximo de 19.954,1 ms. O resumo geral teve média de 513,0 ms e o filtrado de 609,0 ms. As médias não descrevem os casos extremos nem separam filtros e páginas. Próxima validação em ambiente isolado: provocar contenção de cache e comparar planos com filtros comuns e deslocamentos diferentes. A correção de banco deve distinguir cache ocupado de fila vazia e manter o controle de carga.
