# Continuar no computador da empresa — registro de 29/09/2026

## Baixar o trabalho

As alterações estão na branch `codex/sincronizacao-acumulativa-cdc`.

Com o projeto aberto no computador da empresa:

```powershell
git fetch origin
git switch codex/sincronizacao-acumulativa-cdc
git pull --ff-only origin codex/sincronizacao-acumulativa-cdc
```

Antes de trocar de branch, guarde qualquer alteração local ainda não enviada. Os
arquivos `.db`, backups, logs e segredos não são enviados ao GitHub.

## Estado da produção ao encerrar o dia

A atualização acumulativa da fonte modificada em 28/09 às 16:09 foi concluída e
auditada:

- 76.133 casos ativos;
- 219.574 casos inativos;
- 4.979 matrículas novas ou alteradas;
- 8.545 casos novos;
- 13.876 casos reativados porque reapareceram na fonte;
- 9.147 casos ativos alterados;
- 25.965 casos ausentes na fotografia nova foram mantidos ativos;
- verificação final com zero matrículas ou casos pendentes.

### Correção de 80% ainda pendente

Depois da carga foi identificado que a preservação acumulativa precisava separar
dois motivos diferentes para um caso não estar na base preparada:

- ausente de verdade na fonte: deve ser mantido;
- presente na fonte, mas abaixo de 80%: deve sair da fila.

O código dessa separação está pronto e cinco testes passaram, mas o envio foi
interrompido antes da escrita para continuar no computador da empresa. A produção
ainda contém 5.022 casos ativos abaixo do corte:

- 1.376 já concluídos, que continuarão visíveis no histórico;
- 3.646 pendentes, que devem sair da fila;
- 20.943 ausentes reais, que devem continuar ativos.

Por isso, antes da correção o painel pode mostrar 80.431 no total, 58.414
pendentes e 22.017 concluídos. Depois da correção, mantendo a mesma fonte, a
expectativa é aproximadamente 76.785 no total, 54.768 pendentes e 22.017
concluídos.

No computador da empresa, execute `ATUALIZAR_BASE_DIARIA.bat`. Na simulação,
confirme que aparecem mensagens equivalentes a:

```text
Casos ativos ausentes nesta carga que serão mantidos: 20.943
Casos ativos presentes na origem abaixo do corte de 80% que serão desativados: 5.022
```

Se a fonte tiver mudado novamente, os números podem variar. O ponto obrigatório é
que ausentes apareçam como **mantidos** e abaixo de 80% apareçam como
**desativados**. A rotina fará outro backup antes do envio e uma verificação final.

A primeira tentativa corretiva apenas simulou e não desativou linhas por causa de
uma condição no código, já corrigida. A segunda foi interrompida durante a leitura
remota, antes de qualquer lote de escrita. Não houve alteração parcial.

O backup anterior ao envio está em
`backups/backup_supabase_20260929_004327.json.gz` no OneDrive deste projeto. O
relatório está em `logs/atualizacoes/atualizacao_20260928_213320.log`.

## O que mudou na atualização diária

`ATUALIZAR_BASE_DIARIA.bat` agora executa uma sincronização acumulativa:

- insere pares novos;
- atualiza o mesmo `caso_id` quando os dados mudam;
- reativa um par conhecido quando ele reaparece;
- mantém ativo o caso que estiver ausente no arquivo do dia.

Para `Possível imóvel duplicado` e `Revisão visual recomendada`, a regra continua
sendo `similaridade >= 80%`. Casos desses tipos presentes abaixo de 80% são
explicitamente retirados da fila, sem confundi-los com ausências da fonte. Os
outros tipos não usam esse corte.

A ausência na fotografia diária não é mais interpretada como exclusão. A relação
de ausentes é gravada localmente em `logs/planos_sincronizacao/` para auditoria.

Não use `manutencao/RECONCILIAR_BASE_OFICIAL.bat` na rotina diária. Esse modo é
excepcional e continua autorizado a desativar ausentes.

## Recuperação dos casos retirados na primeira carga de 28/09

Não execute `UPDATE casos SET ativo=true` para todos os inativos. Existem mais de
200 mil casos antigos legitimamente inativos.

A carga acumulativa da noite já reativou 13.876 casos que reapareceram. Para
recuperar o restante com segurança, ainda é necessária uma referência anterior à
primeira carga de 28/09. As fontes aceitas são:

1. uma cópia anterior de `publicacao_drive/base_web.db`;
2. um snapshot/lista dos IDs que estavam ativos;
3. um clone temporário criado pelo backup diário do Supabase anterior à carga.

Se houver uma cópia anterior de `base_web.db`, primeiro simule:

```powershell
python scripts/restaurar_ativos_ultima_sincronizacao.py `
  --base-anterior "C:\caminho\base_web_antes_20260928.db" `
  --esperado 24915
```

O script compara as bases, consulta a produção e separa os casos já ativos dos que
ainda precisam ser reativados. Somente depois de conferir os totais, repita com
`--enviar`. Ele exigirá a frase `RESTAURAR CASOS`.

O arquivo `dados/controle_auditoria.db` só pode ser usado se realmente contiver as
duas sincronizações relevantes. O atualizador web recria
`dados/preparacao_web.db`, portanto o banco de controle normalmente não registra
essas cargas.

## Validação já realizada

- quatro testes de segurança passaram;
- os scripts Python compilaram sem erro;
- a carga real terminou sem timeout de escrita;
- a verificação posterior retornou zero diferenças;
- os planos de IDs e segredos permanecem fora do Git.

O próximo trabalho técnico é substituir a leitura REST integral por uma comparação
no próprio banco antes de agendar a rotina no GitHub Actions.
