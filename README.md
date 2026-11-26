# Auditoria visual de imóveis — Censo Rural

Aplicação web para analisar indícios de duplicidade, desmembramento e inconsistências em imóveis do Censo Rural. O sistema distribui casos por uma fila compartilhada, impede que duas pessoas trabalhem no mesmo caso, registra a decisão vigente e preserva o histórico de correções.

## Estado atual

Preparação de passagem de responsabilidade em [docs/ENTREGA_PROJETO.md](docs/ENTREGA_PROJETO.md).

O frontend React/Vite está ligado ao Supabase e é publicado pelo Cloudflare. A fonte selecionada no computador operacional é a view Azure SQL `VISITAS_CENSO.dbo.vw_desmembramentos`; a extração gera um snapshot SQLite de transporte antes da preparação e da sincronização incremental.

O último commit recebido do computador da empresa foi `f3da4b7` (`Documenta operacao Azure e transferencia de responsabilidade`). Também foram recuperadas mudanças locais posteriores para a integração Azure, correção de links e otimização do planejamento. Consulte [TODO.md](TODO.md) antes de executar a atualização: ainda há validações operacionais que dependem do estado real do Supabase.

## Funcionalidades

- autenticação e perfis `conferente`, `gestor` e `admin`;
- fila com filtros por etapa, município, tipo, similaridade e pesquisa;
- reserva exclusiva de caso e das matrículas relacionadas;
- rascunho e retomada protegida ao recarregar ou reabrir a página;
- comparação de fotos, endereço, observação e links próprios do Backoffice;
- decisões de duplicidade, desmembramento, falso positivo, inconclusivo e já realizado;
- correção supervisionada com histórico somente quando há mudança real;
- produtividade pessoal e da equipe, pendências, prioridades e monitoramento;
- importação incremental, simulação, backup, aplicação em lotes e proteção de reservas.

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 19, Vite 8 e JavaScript |
| Backend e autenticação | Supabase: PostgreSQL, Auth, PostgREST/RPC e Realtime |
| Origem | Azure SQL via ODBC 18; SQLite legado e snapshots de transporte |
| Processamento | Python 3.11+, `requests` e `pyodbc` |
| Hospedagem | Cloudflare Workers Assets, configurado em `wrangler.jsonc` |
| Testes | `unittest` do Python e `node:test` |

As versões JavaScript estão fixadas em `package-lock.json`. As dependências Python estão em `requirements-local.txt`; o Microsoft ODBC Driver 18 é uma dependência do sistema e não é instalado pelo `pip`.

## Estrutura

| Caminho | Responsabilidade |
|---|---|
| `src/` | interface, sessão, reserva, rascunho e cliente público Supabase |
| `scripts/` | extração, preparação, simulação, backup, aplicação e administração |
| `sql/migracoes_aplicadas/` | histórico das migrações que compõem a base conhecida |
| `sql/` | instalações, correções e diagnósticos pontuais; não executar em lote |
| `tests/` | testes Python e Node ativos |
| `docs/` | arquitetura, regras, decisões e manuais vigentes |
| `manutencao/` | atalhos e rotinas operacionais excepcionais |
| `ferramentas/` | diagnósticos manuais |
| `historico/` | protótipos e procedimentos encerrados; não executar em produção |
| `dados/`, `backups/`, `logs/` | artefatos locais sensíveis, ignorados pelo Git |

## Instalação

Pré-requisitos: Git, Node.js/npm, Python 3.11 ou superior e, para Azure, Microsoft ODBC Driver 18. Na raiz:

```powershell
manutencao\PREPARAR_AMBIENTE_PYTHON.bat
npm ci
```

No Windows, o botão diário chama esse preparador automaticamente quando necessário. Ele cria o ambiente em `%LOCALAPPDATA%\desmembramento-censo\python-env-v1` e também verifica o Microsoft ODBC Driver 18. Quando o Azure CLI está instalado, o botão abre o login corporativo no tenant da fonte e usa o token somente em memória para ler o Azure SQL; isso evita falhas do login WAM do ODBC e tokens emitidos para o tenant errado. O tenant pode ser substituído localmente por `DESMEMBRAMENTO_AZURE_TENANT_ID`, sem armazenar credenciais. Não sincronize `.venv` entre computadores: ambientes virtuais guardam caminhos absolutos e deixam de funcionar quando o usuário ou a pasta muda. Em Linux/macOS, crie um ambiente local equivalente e instale `requirements-local.txt`.

O frontend precisa de `.env.local`, baseado em `.env.example`, com a URL e a chave pública do Supabase. Scripts administrativos usam `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente ou a configuração privada local já suportada. Nunca coloque `service_role` em variável `VITE_*`.

Para selecionar Azure neste computador, crie `dados/fonte_oficial.json` conforme [docs/OPERACAO_E_MIGRACAO.md](docs/OPERACAO_E_MIGRACAO.md). Sem esse arquivo o seletor mantém o padrão legado SQLite; sempre confira a fonte exibida antes de aplicar.

## Executar e validar

```powershell
npm run dev
npm run build
python -m unittest discover -s tests -p "test_*.py"
node --test tests/reserva_pagina.test.mjs
```

No Windows, `manutencao\INICIAR_WEB.bat` prepara a configuração pública e inicia o ambiente local. Para atualizar dados, primeiro faça somente a simulação descrita no manual operacional. `ATUALIZAR_BASE_DIARIA.bat` pode aplicar alterações reais e não deve ser usado como teste.

## Leitura obrigatória

1. [docs/CONTINUIDADE.md](docs/CONTINUIDADE.md): estado vigente entre computadores, diferenças e retomada.
2. [TODO.md](TODO.md): riscos e tarefas detalhadas.
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): componentes e fluxo de dados.
4. [docs/DATA_RULES.md](docs/DATA_RULES.md): regras de domínio extraídas do código.
5. [docs/DECISIONS.md](docs/DECISIONS.md): decisões técnicas vigentes.
6. [docs/DESENVOLVIMENTO_NUVEM.md](docs/DESENVOLVIMENTO_NUVEM.md): variáveis e limites do ambiente em nuvem.
7. [docs/OPERACAO_E_MIGRACAO.md](docs/OPERACAO_E_MIGRACAO.md): instalação e operação Azure.
8. [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md): uso e atendimento.
9. [docs/TRANSFERENCIA_E_CONTINUIDADE.md](docs/TRANSFERENCIA_E_CONTINUIDADE.md): passagem de responsabilidade anterior.

## Cuidados

- Não execute todos os arquivos de `sql/`; vários são históricos ou substituem funções existentes.
- Não rode duas sincronizações ao mesmo tempo, inclusive em computadores diferentes.
- Não aplique plano antigo depois de alterar a fonte, o snapshot ou o importador.
- Não apague casos, revisões, históricos ou reservas para “destravar” uma carga.
- Dados, snapshots, backups, logs e credenciais devem ser transferidos por canal seguro, fora do Git.
- Atualizar o Supabase não publica o frontend; publicar o frontend não instala SQL.
