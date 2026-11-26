# Sincronização acumulativa da base

> Referência da política legado SQLite. Desde a adoção Azure em 13/10/2026, pendentes ausentes podem ser arquivados, com preservação de avaliações e reservas. Para operar hoje, use [Atualização Azure](ATUALIZACAO_AZURE.md) e [operação e migração](OPERACAO_E_MIGRACAO.md). Não interpretar a preservação de todos os ausentes abaixo como política Azure nem alternar fontes durante uma carga.

## Regra operacional

A atualização diária passa a tratar cada SQLite recebido como um conjunto de
alterações, e não como uma fotografia que apaga o que deixou de aparecer:

- par novo: insere o caso e as matrículas ainda inexistentes;
- par já conhecido com dados diferentes: atualiza o mesmo `caso_id`;
- par já conhecido sem mudança: não envia novamente;
- caso existente ausente no arquivo do dia: mantém o caso como está;
- caso inativo que reaparece: reativa e atualiza.

O `caso_id` é o hash estável dos dois Códigos Deep ordenados. Por isso, o mesmo
par continua sendo o mesmo caso mesmo quando seus demais campos mudam. Se os
Códigos Deep que formam o par mudarem, surge outro caso, pois a identidade do par
também mudou.

Esse comportamento é semelhante a CDC para inserções e atualizações. A origem,
porém, fornece fotografias SQLite e não eventos reais de exclusão. Assim, a
ausência de uma linha não será interpretada como exclusão.

## Execução diária

Use `ATUALIZAR_BASE_DIARIA.bat`. A simulação mostra quantos casos novos,
alterados, reativados e ausentes existem. Os ausentes aparecem como **mantidos**.
Antes de qualquer envio, a rotina grava a relação completa em
`logs/planos_sincronizacao/ausentes_AAAAMMDD_HHMMSS.json`.

Antes da preparação, a rotina valida se o arquivo ficou estável, confirma o
cabeçalho SQLite, a tabela e as colunas obrigatórias e grava uma assinatura da
origem em `logs/manifestos_origem/`. A verificação completa com
`PRAGMA quick_check` e SHA-256 integral está disponível por
`scripts/validar_fonte_sqlite.py --verificacao-completa`; ela deve ser usada no
runner em disco local ou em auditorias periódicas, pois é lenta sobre uma pasta
sincronizada de quase 1 GB.

Os scripts de backup e sincronização aceitam `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` pelo ambiente, preparando o uso de GitHub Secrets,
mas continuam compatíveis com `.streamlit/secrets.toml` na operação manual.

A carga continua respeitando reservas ativas. Casos e matrículas que alguém está
usando são adiados para a próxima atualização.

## Reconciliação excepcional

`manutencao/RECONCILIAR_BASE_OFICIAL.bat` continua existindo para uma substituição
intencional da fotografia oficial. Só esse modo acrescenta
`--desativar-ausentes --permitir-desativacao-massiva`, exige a frase especial e
desativa ausentes sem reserva. Não deve ser usado na rotina diária.

## Recuperação da carga de 28/09/2026

A carga de 28/09 desativou 24.915 casos antes desta regra. O backup do Supabase
feito naquele dia contém revisões e perfis, mas não contém a tabela `casos`. O
banco de controle presente neste computador também é de 01/09. Portanto, esses
dois artefatos isolados não informam com segurança quais eram os 24.915 IDs.

Para uma restauração exata, use uma destas fontes:

1. a relação de IDs ou uma cópia de `base_web.db` anterior à carga; ou
2. um `dados/controle_auditoria.db` que comprovadamente contenha as duas cargas; ou
3. uma restauração temporária do backup diário do projeto Supabase para extrair
   os IDs ativos, sem substituir diretamente a produção.

Não reative todos os casos inativos: parte deles já estava inativa por regras
anteriores e seria recolocada indevidamente na fila.

### Opção pelo Histórico de versões do OneDrive

No OneDrive, baixe uma versão de `publicacao_drive/base_web.db` anterior à
preparação das 08:47 de 28/09. Salve com outro nome, sem substituir o arquivo
atual, por exemplo `base_web_antes_20260928.db`. Depois simule:

```powershell
python scripts/restaurar_ativos_ultima_sincronizacao.py `
  --base-anterior "C:\caminho\base_web_antes_20260928.db" `
  --esperado 24915
```

O programa compara a versão anterior com `publicacao_drive/base_web.db`, consulta
o estado atual no Supabase e mostra quantos realmente precisam ser reativados.
Acrescente `--enviar` apenas depois de conferir que há 24.915 candidatos.

O atualizador web usa `dados/preparacao_web.db` temporário e o recria em cada
execução. Portanto, não presuma que `dados/controle_auditoria.db` tenha o histórico
necessário. Se esse arquivo tiver sido atualizado separadamente e contiver as duas
cargas, simule:

```powershell
python scripts/restaurar_ativos_ultima_sincronizacao.py --esperado 24915
```

Se a simulação identificar exatamente 24.915 candidatos, nenhum ID inexistente e
os totais esperados, execute novamente com `--enviar`. O script ainda exige a
frase `RESTAURAR CASOS`, reativa somente os IDs daquela carga anterior que estão
inativos e atualiza os caches. Um caso que ficou ativo por reserva não é alterado.

## GitHub Actions

O fluxo pode ser automatizado depois que a rotina acumulativa for validada em
produção. A opção simples é instalar um runner auto-hospedado no computador que
já sincroniza o SharePoint. Um runner hospedado pelo GitHub exigirá acesso ao
arquivo pelo Microsoft Graph/SharePoint, porque não enxerga a pasta local.

A automação deve ter:

- execução diária com `concurrency` para impedir duas cargas simultâneas;
- credenciais do Supabase em GitHub Secrets;
- validação de data, tamanho e hash do SQLite de origem;
- rotina acumulativa como único modo agendado;
- logs e plano de ausentes publicados como artefatos;
- backup antes do envio;
- reconciliação destrutiva fora do agendamento e com aprovação manual.

## Comparação por estágio em preparação

`sql/CRIAR_ESTAGIO_SINCRONIZACAO_WEB.sql` prepara tabelas privadas para receber
somente IDs e hashes e calcular as diferenças no PostgreSQL. A migração não
altera `casos`, `matriculas`, revisões ou reservas e não muda o fluxo vigente por
si só. As estruturas usam RLS, são acessíveis apenas pela `service_role`, possuem
índices por carga, `statement_timeout` e trava consultiva para impedir dois
planejamentos simultâneos. Ausências continuam preservadas e reservas ativas são
excluídas do plano de escrita.

O cliente do estágio será ativado inicialmente como opção experimental. O fluxo
REST atual permanece como referência até que uma mesma fonte produza contadores
idênticos nos dois modos.
