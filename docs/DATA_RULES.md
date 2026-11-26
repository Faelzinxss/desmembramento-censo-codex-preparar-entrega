# Regras de dados e negócio

Regras confirmadas no código em **17/10/2026**. Quando a definição depende do banco de produção e não pôde ser confirmada localmente, está marcada como **PENDENTE DE CONFIRMAÇÃO**.

## Formação e classificação da fila

| Regra | Implementação |
|---|---|
| Status contendo `desmembramento` ou `foto intrusa` vira `Possível desmembramento inconsistente`. | `scripts/regras_fonte.py` |
| Status contendo `duplicata` vira `Possível imóvel duplicado`. | `scripts/regras_fonte.py` |
| Status contendo `fraude` vira `Possível inconsistência de Backoffice`. | `scripts/regras_fonte.py` |
| Status contendo `revisão`, `revisao` ou `alerta de proximidade` vira `Revisão visual recomendada`. Outros status não entram na fila. | `scripts/regras_fonte.py` |
| `Possível imóvel duplicado` e `Revisão visual recomendada` entram na fila somente com similaridade numérica maior ou igual a 80%. | `scripts/sincronizar_base.py` |
| Outros tipos aprovados não usam o corte de 80%. | `scripts/sincronizar_base.py` |
| Código vazio, suspeito vazio e autorreferência são ignorados. | `scripts/sincronizar_base.py` |

## Identidade e deduplicação

- Os códigos são aparados, convertidos para maiúsculas e ordenados; A–B e B–A são o mesmo par.
- `caso_id` usa os primeiros 24 caracteres do SHA-256 de `code_a|code_b`.
- Várias linhas do mesmo par são consolidadas. A maior similaridade válida encontrada é mantida.
- Uma segunda leitura por `ID_Completo` completa os dados do lado que apareceu primeiro apenas como suspeito.
- O identificador de origem Azure é um hash lógico das colunas e linhas, independente da ordem de leitura.

Implementação: `scripts/sincronizar_base.py` e `scripts/extrair_fonte_sql_server.py`.

## Campos das matrículas

- Foto principal: primeira URL válida da foto da propriedade; se ausente, usa a foto da estrutura.
- Foto de estrutura é preservada separadamente.
- Cada lado usa o `Link Backoffice` de sua própria linha `ID_Completo`. `URL_Backoffice`, pertencente ao suspeito, nunca é emprestada ao outro lado.
- Município vem diretamente de `1.4 Município_field`; não há correção aproximada pelo IBGE.
- Agente, data, endereço, complemento, observação da origem e situação do Backoffice são copiados da fonte e aparados.
- Ao consolidar linhas, um valor já preenchido não é substituído por vazio.

Implementação: `scripts/sincronizar_base.py`; contrato em `docs/CONTRATO_FONTE_SQL_SERVER.md`.

## Validação Azure

- A view precisa atender às colunas críticas e complementares do contrato.
- `ID_Completo` não pode ser vazio nem repetido sem considerar maiúsculas/minúsculas.
- Uma linha não pode referenciar a si mesma.
- Toda referência não vazia precisa existir como `ID_Completo` no snapshot.
- Similaridade preenchida deve estar entre 0 e 100.
- Snapshot vazio ou sem referências é rejeitado.

Implementação: `scripts/extrair_fonte_sql_server.py` e `scripts/contrato_fonte_sql_server.py`.

## Avaliação humana

Decisões disponíveis no frontend:

- `Falso positivo`;
- `Desmembramento`;
- `Duplicidade`;
- `Inconclusivo`;
- `Já realizado anteriormente`.

`Duplicidade` exige indicar A ou B. `Desmembramento` exige indicar A ou B e informar o novo Código Deep. A observação é opcional no frontend. Antes de liberar a decisão, os dois links disponíveis do Backoffice precisam ser registrados como consultados; lado sem link é tratado conforme a RPC vigente. Antes de salvar, o frontend confirma novamente a reserva.

O salvamento envia um `operacao_id` estável por abertura do modal e a versão da revisão. O cliente só aceita `salvo`, `sem_alteracao` ou `ja_concluido` como confirmação. Implementação: `src/main.jsx` e contratos SQL v2.

## Lote com matrícula em vermelho no envio

Regra operacional confirmada pelo usuário em **22/10/2026**; automação ainda não implementada.

- Após preencher todas as matrículas do lote, se alguma matrícula continuar em vermelho na etapa de envio, deixar o lote **pendente de verificação**.
- Registrar a matrícula sinalizada e a mensagem de validação exibida para análise humana antes de concluir o lote.
- Conferir a ausência de CPF como uma possível causa; a cor vermelha, sozinha, não comprova que o CPF está ausente.
- A conclusão depende de verificar e resolver a pendência. O destaque vermelho não deve ser ignorado para considerar o lote concluído.

**Pendente de implementação:** identificar a tela e o retorno de validação que sinalizam essa ocorrência, para automatizar sua detecção e o encaminhamento à verificação.

## Reserva, abas e retomada

- A reserva pertence ao caso, usuário, sessão/aba e token retornado pelo servidor.
- Uma aba duplicada não herda a identidade da original.
- Rascunhos são isolados por usuário, caso e versão da revisão.
- Operações locais de abrir, fechar e avançar são serializadas.
- A renovação periódica e o salvamento compartilham a requisição em voo; resposta atrasada de caso antigo não deve afetar o novo.
- Uma reserva vencida não autoriza salvamento nem é recriada silenciosamente.
- Ao fechar/recarregar, a retomada depende de Web Locks e ainda é confirmada no servidor.

Implementação: `src/reservaPagina.js`, `src/main.jsx` e testes `tests/reserva_pagina.test.mjs`.

**PENDENTE DE CONFIRMAÇÃO:** duração exata e intervalo de renovação instalados hoje no banco. Documentos anteriores citam 10 minutos e renovação a cada 2 minutos, mas as RPCs atuais devem ser exportadas para confirmar.

## Revisões e histórico

- `revisoes` contém uma decisão vigente por caso.
- `revisoes_historico` contém versões anteriores criadas por uma correção real.
- Repetição idempotente e confirmação sem alteração não devem gerar nova produção nem histórico.
- Correção supervisionada é diferente de primeira avaliação e não entra no avanço automático.
- Casos fora da base atual podem manter a avaliação e ser corrigidos sem voltar a ser pendência.

Implementação observável: `src/main.jsx`; garantias definitivas dependem das RPCs/triggers v2. **PENDENTE DE CONFIRMAÇÃO:** exportar a definição instalada de `salvar_revisao_web_v2` e do gatilho de histórico.

## Sincronização

- A simulação cria/atualiza estágio e plano, mas não altera `casos`, `matriculas` ou avaliações.
- Aplicação exige que o hash da origem ainda corresponda à base preparada.
- Preparação Azure sem contrato de links `proprios-v1` é bloqueada.
- Casos e matrículas ligados a reserva ativa são adiados.
- A rotina comum insere novos, atualiza conhecidos e reativa reaparecidos por hash.
- Regra legado: ausentes permanecem ativos; somente fora do corte é desativado. Reconciliação excepcional possui trava de redução superior a 20%.
- Regra Azure pretendida: pendentes ausentes são arquivados, casos com revisão são preservados e reservas são revalidadas no servidor.
- Se houver adiamentos, o resultado é `parcial_aguardando_reservas`; somente uma aplicação sem adiamentos é finalizada.

Implementação: `scripts/simular_sincronizacao_estagio.py`, `scripts/aplicar_sincronizacao_estagio.py`, `scripts/sincronizar_supabase_web.py` e `sql/ADOTAR_AZURE_ARQUIVAR_PENDENTES_AUSENTES.sql`.

**PENDENTE DE CONFIRMAÇÃO:** estado e versão das funções Azure instaladas em produção e situação final da carga iniciada em 13/10/2026.

## Perfis e relatórios

- `conferente` opera a fila e consulta a própria produtividade.
- `gestor` e `admin` são tratados como supervisores no frontend e acessam painéis de equipe/prioridades.
- Datas dos relatórios são enviadas como período; a interpretação final de fuso e inclusão dos limites depende da RPC.
- Município A=B deve contar uma vez no relatório municipal; A diferente de B pode aparecer nos dois municípios, enquanto o total global continua por caso.

Implementação: `src/main.jsx` e migrações de produtividade/pendências. **PENDENTE DE CONFIRMAÇÃO:** reconciliar as RPCs instaladas com os SQLs locais mais recentes.
