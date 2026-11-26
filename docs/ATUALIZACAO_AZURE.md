# Atualização pela view Azure SQL

Entrada local para a rotina acumulativa, mantendo as mesmas identidades de pares,
revisões, corte de escopo, reservas, backup e verificação do fluxo existente.
O SQLite gerado por este leitor é apenas um snapshot de transporte do Azure:
não utiliza o arquivo SQLite corporativo como origem.

## Primeiro planejar

```powershell
python scripts/atualizar_base_azure.py --usuario SEU_EMAIL_CORPORATIVO
```

Por padrão só prepara a cópia local e o estágio/plano no Supabase. Não aplica
casos nem matrículas. A view deve ter terminado sua regeneração antes da leitura;
a validação de estrutura não comprova a versão ou atomicidade da carga Azure.

Snapshots completos ficam em `dados/fontes_azure/<id>/fonte.db`, com manifesto.
Para preparar o mesmo snapshot sem nova leitura/login:

```powershell
python scripts/atualizar_base_azure.py --snapshot CAMINHO_DO_SNAPSHOT
```

Após conferir e aprovar o plano, acrescentar `--aplicar` para seguir com backup,
aplicação e verificação. `--confirmar` também dispensa a confirmação por texto,
mas exige `--aplicar`. Não alternar fontes durante aplicação/retomada de uma carga.
O hash lógico é estável para o mesmo conteúdo, independentemente da ordem de leitura.

## Histórico e ausentes

Novo par é novo caso, mesmo se uma das matrículas já foi revisada em outro par.
As revisões existentes não são apagadas. Dados do caso/matrícula podem mudar.
Política aprovada em 13/10/2026: pendentes ausentes do Azure são arquivados
(`ativo=false`), sem apagar o registro. Ausentes com revisão continuam preservados;
o arquivamento revalida revisão/reserva no servidor no momento da aplicação.
Se o par reaparecer, a mesma identidade pode ser reativada. O corte normal dos
tipos sujeitos a similaridade continua separado. SQLite preserva ausentes.
Instalar antes `sql/ADOTAR_AZURE_ARQUIVAR_PENDENTES_AUSENTES.sql`; sem a RPC
de versão correta o cliente bloqueia a carga Azure. A primeira simulação anterior
(hash azure-v1) não contém o arquivamento e não deve ser aplicada como novo plano.

## Contrato dos links de Backoffice

`Link Backoffice` pertence ao `ID_Completo` da linha. `URL_Backoffice` pertence
ao `Codigo_Suspeito` e não deve ser usado como alternativa para a matrícula
principal. Cada lado do par recebe o link do seu próprio cadastro; se faltar,
fica sem link em vez de receber o link do outro lado.

Preparações Azure anteriores ao contrato `proprios-v1` são bloqueadas na
aplicação: é necessário preparar um novo plano com o importador corrigido.
O reparo pontual `scripts/corrigir_links_backoffice.py` usa plano/backup salvo,
altera somente o link e invalida seu hash técnico, preservando avaliações.
A RPC privada `sql/CORRIGIR_LINKS_BACKOFFICE_SEM_RESERVAS.sql` pula matrículas
reservadas e só altera links que ainda correspondem ao valor anterior do backup.
Não liberar reservas à força para concluir o reparo.

## Fonte oficial e automação

O atalho `ATUALIZAR_BASE_DIARIA.bat` usa `scripts/atualizar_base_oficial.py`.
Neste computador, `dados/fonte_oficial.json` seleciona Azure, o usuário corporativo
e o Python com driver/bibliotecas instalados. A configuração não contém senha e é
ignorada pelo Git. Sem configuração, o padrão legado é SQLite; configurações
inválidas falham sem trocar silenciosamente de fonte.
Não alternar para SQLite durante aplicação/retomada de carga Azure.
O login/MFA da Microsoft pode ser solicitado ao executar o atalho local.
Não há atualização periódica ou GitHub Actions habilitado por este código.
Login interativo exige uma pessoa; automação depende de credencial e rede aprovadas.
Conexão não interativa pode ser fornecida em
`DESMEMBRAMENTO_SQLSERVER_CONNECTION_STRING`, nunca no Git ou no chat.

Snapshots e backups contêm dados pessoais; ficam nas pastas ignoradas pelo Git.
