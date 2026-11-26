# Operação e continuidade da migração Azure

Revisão: **15/10/2026**. Comandos executados na raiz do projeto, em PowerShell. Exemplos com `SEU_EMAIL_CORPORATIVO`, caminhos ou IDs exigem substituição. Não executar aplicação ou SQL apenas para conferir a documentação.

## 1. Preparar outro computador

Antes: obter código local revisado, acesso Azure/Supabase, identidade própria e cópia segura dos arquivos necessários. Há componentes Azure ainda não versionados no momento desta revisão; confirmar o pacote com o responsável. Não basta clonar o `main`.

Requisitos:

- Python compatível com o código (`tomllib` requer Python 3.11 ou superior), acessível no terminal.
- Microsoft ODBC Driver 18 for SQL Server compatível com a arquitetura do Python; instalação pode depender de administrador.
- Node.js compatível com `package.json`/lockfile, se for desenvolver/publicar frontend.
- Leitura em `dbo.vw_desmembramentos`, banco `VISITAS_CENSO`, servidor `bdcenso.database.windows.net`, e conexão de rede autorizada.
- Configuração privada Supabase entregue por canal aprovado.

Instalação local Python, sem mudar o Python global:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-local.txt
```

Usar esse executável nos comandos seguintes ou ativar o ambiente. ODBC não é instalado pelo `pip`. Não colocar credenciais em comandos que ficam no histórico do terminal.

### Configuração da fonte oficial

Criar localmente `dados/fonte_oficial.json`, fora do Git, com UTF-8. Modelo:

```json
{
  "fonte": "azure_sql",
  "usuario": "SEU_EMAIL_CORPORATIVO",
  "python": "C:/CAMINHO/DO/PROJETO/.venv/Scripts/python.exe"
}
```

Substituir o caminho por executável existente. O seletor lê `fonte`, `usuario` e `python`; outras anotações locais não configuram por si só política no servidor. A política Azure depende do importador e das RPCs compatíveis instaladas.

**Sem esse arquivo o seletor usa o padrão legado SQLite.** Antes do atalho, conferir `Fonte oficial: azure_sql`. Não copiar o caminho Python de João como se existisse na máquina nova.

### Credenciais e ambiente

- Python lê `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente, com alternativa em `.streamlit/secrets.toml`, seção `[supabase]`, campos `url` e `secret_key` ou `service_role_key`. Obter o valor pelo cofre aprovado; não documentar o valor real.
- O frontend Vite usa `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, públicas. Chave de serviço nunca vai ao navegador.
- Não presumir que o Python carrega `.env.local` ou `.env.example`: esses arquivos não configuram automaticamente todas as rotinas Python.
- O caminho padrão Azure usa autenticação Microsoft interativa e pode solicitar MFA. Firewall e permissão de leitura são independentes do login.
- `DESMEMBRAMENTO_SQLSERVER_CONNECTION_STRING` pode fornecer conexão não interativa aprovada; não é necessário criá-la para continuar manualmente com login interativo.

## 2. Antes de cada atualização

1. Confirmar com o dono da fonte que a atualização da view terminou e qual data/versão representa. Validação de colunas não prova consistência/atualidade upstream.
2. Conferir fonte configurada, espaço local, acesso ao backup e se não há outra execução. A trava local não coordena computadores diferentes; combinar um único operador.
3. Conferir se há carga anterior parcial e qual snapshot/contrato foi usado. Não alternar fonte nem aplicar arquivo preparado por importador antigo.
4. Programar revisão do plano: variação inesperada, arquivamento amplo ou referência sem cadastro exige investigação antes de continuar.

Os analistas podem continuar trabalhando: a aplicação tenta preservar reservas. Isso pode produzir atualização parcial, que precisa ser acompanhada. Não liberar reservas à força para completar lotes.

## 3. Simular primeiro

Com a configuração oficial validada:

```powershell
.\.venv\Scripts\python.exe scripts/atualizar_base_oficial.py --somente-simular
```

Ou entrada explícita Azure:

```powershell
.\.venv\Scripts\python.exe scripts/atualizar_base_azure.py --usuario SEU_EMAIL_CORPORATIVO
```

Isso lê a view, grava snapshot/preparação local e escreve manifesto, estágio e plano no Supabase. **Não aplica casos/matrículas nem avaliações**, mas não é uma operação totalmente sem escrita no servidor. Para comparar Azure/SQLite sem acessar Supabase existe [teste de fonte](TESTE_FONTE_SQL_SERVER.md), pensado para homologação, não para alternar a fonte diária.

Conferir no resultado: origem Azure, IDs da carga e snapshot, matrículas inseridas/atualizadas, casos novos/reativados/atualizados, desativações/arquivamentos, ausentes preservados e reservas adiadas. Não comparar apenas o total bruto da view com o painel: há deduplicação, cortes e histórico preservado.

## 4. Aplicar após aprovação

Preferir o mesmo snapshot validado e já conferido, evitando reler uma view que possa ter mudado. A rotina prepara/planeja novamente e exige confirmação para aplicar:

```powershell
.\.venv\Scripts\python.exe scripts/atualizar_base_azure.py --snapshot "C:/CAMINHO/DO/SNAPSHOT/fonte.db" --aplicar
```

Usar snapshot completo com origem conhecida e contrato atual. A opção `--confirmar`, junto de `--aplicar`, dispensa a confirmação digitada; reservá-la para operação previamente aprovada.

O atalho `ATUALIZAR_BASE_DIARIA.bat` já usa o modo confirmado. Ele pode extrair outra versão da view; não é apenas um botão de simulação. Não executar de novo só porque o terminal ficou aberto.

Etapas exibidas pela rotina:

1. Validar fonte/snapshot.
2. Preparar base web local.
3. Simular/enviar estágio e planejar diferenças.
4. Fazer backup específico do plano.
5. Aplicar lotes respeitando reservas.
6. Verificar status/contadores/temporários da carga.
7. Exibir conclusão verificada.

O sucesso esperado inclui `ATUALIZAÇÃO INCREMENTAL CONCLUÍDA E VERIFICADA.` ou indicação explícita de versão já aplicada. Na simulação, terminar sem aplicação é normal; guardar o resultado com essa identificação.

## 5. Parcial, erro e retomada

| Resultado | Significado | Conduta |
|---|---|---|
| `finalizada` e verificação aprovada | Lotes concluídos e verificações executadas | Guardar carga, logs, backup e amostra funcional |
| `parcial_aguardando_reservas` / saída 2 | Alguns registros não foram aplicados para proteger trabalho em andamento | Preservar carga/snapshot/backup; aguardar liberação e replanejar com importador atual |
| Timeout/erro / saída 1 | Rotina interrompida, sem garantia de conclusão | Identificar etapa e estado remoto; não usar plano antigo por tentativa |
| Versão já aplicada | Rotina reconheceu versão finalizada | Não forçar nova carga nem limpar metadados para reaplicar |

Saída zero também pode ser simulação ou cancelamento antes de aplicar: ler a mensagem, não apenas o código. Arquivos `ultima_*` podem ser sobrescritos por nova execução; preservar cópias datadas ao registrar incidente.

Não apagar a trava `.atualizacao_base_em_andamento` sem confirmar que não existe processo ativo. Não rodar simultaneamente em dois computadores; a trava é local. Não executar reconciliação legado como substituto da política Azure.

Após timeout no planejamento, usar [diagnóstico de planejamento](RETOMAR_ATUALIZACAO_TIMEOUT.md). O script `scripts/diagnosticar_planejamento.py --carga-id ID_DA_CARGA` não aplica casos, mas executa planejamento no servidor; usar apenas no contexto da carga e com acesso autorizado.

Para verificar uma carga efetivamente finalizada:

```powershell
.\.venv\Scripts\python.exe scripts/verificar_sincronizacao_estagio.py --carga-id ID_DA_CARGA
```

Ele confere status, contador de casos ativos e temporários; não prova sozinho que todos os links ou avaliações estão corretos. Conferir amostras e reclamações dos analistas.

## 6. Pendências da adoção inicial

- A carga de referência `665293d2-fada-48e0-b2d2-51ad1d9cd73d` teve aplicação parcial registrada em 13/10. Consultar estado atual antes de decidir retomada.
- Preparações antigas dessa fase antecedem o contrato de links próprios. Usar código atual e plano novo; não contornar a proteção `proprios-v1`.
- O reparo de links de 13/10 corrigiu 136.915 registros e adiou sete. Verificar se a rotina posterior já corrigiu os restantes. Não executar reparo geral sem conferir plano/backup e valores atuais.
- A política de arquivamento e o reparo privado tiveram validação informada pelo usuário. Em novo ambiente, isso não comprova instalação: comparar definições e permissões antes de instalar SQL.
- Definições atuais do banco não estão garantidas por uma instalação limpa de todos os SQLs do repositório. É necessário inventário/exportação do servidor para uma migração de infraestrutura.

Para troca de custódia e urgência de saída do responsável: [transferência](TRANSFERENCIA_E_CONTINUIDADE.md).

## 7. Automação futura: o que falta

Não há workflow GitHub Actions ou agendamento habilitado. O login interativo atual não basta para garantir execução noturna sem pessoa.

Antes de automatizar, aprovar e testar:

- Identidade não interativa com leitura mínima da view, sem depender da conta pessoal/sessão de João.
- Rede permitida entre executor e Azure SQL. Não presumir IP fixo de runner nem liberar todas as origens; TI deve escolher o caminho.
- Cofre de segredos e acesso administrativo Supabase restrito ao executor.
- Fonte concluída, controle de uma execução por vez e tratamento de reservas/parciais, sem reaplicação cega.
- Backups/logs persistidos fora de executor temporário, alertas e responsável pela falha.

Sequência: leitura → simulação → aplicação manual supervisionada → execução autônoma aprovada → agendamento. Pode ser GitHub Actions ou infraestrutura corporativa; a escolha não remove a necessidade de autenticação e rede. Não criar serviços ou custos sem aprovação.

## 8. Publicação e testes do aplicativo

Na raiz, após configurar ambiente público de desenvolvimento:

```powershell
npm ci
python -m unittest discover -s tests
node --test tests/reserva_pagina.test.mjs
npm run build
```

Esses testes são locais. Verificar acesso, build/commit efetivo no Cloudflare e fluxos funcionais antes de declarar publicação concluída. Alterações SQL e de fonte não são publicadas automaticamente pelo build do site. Para desenvolvimento, usar projeto/ambiente autorizado separado da produção.

Roteiro funcional mínimo: login e permissões por perfil; filtrar/abrir caso; links dos dois lados e fotos; salvar avaliação; fechar/reabrir e duas abas; atualização parcial com reserva; preservação de revisão; painel após carga finalizada. Não criar avaliações falsas na fila real para testar.
