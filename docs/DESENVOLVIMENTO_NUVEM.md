# Desenvolvimento no ambiente em nuvem

O ambiente em nuvem serve para editar, testar, revisar e abrir PRs. Ele só deve acessar Azure ou escrever no Supabase quando TI tiver fornecido rede, identidade, cofre de segredos e executor persistente apropriados.

## Configurações necessárias

Use os nomes abaixo no gerenciador de segredos do ambiente. Nunca grave valores no Git, em documentação, logs ou mensagens.

| Nome | Uso | Exposição permitida |
|---|---|---|
| `VITE_SUPABASE_URL` | URL pública usada pelo frontend | Bundle do frontend |
| `VITE_SUPABASE_ANON_KEY` | chave pública `anon` usada pelo frontend | Bundle do frontend |
| `SUPABASE_URL` | endpoint dos scripts administrativos | Somente processo servidor/script |
| `SUPABASE_SERVICE_ROLE_KEY` | operações administrativas que ignoram RLS | Somente cofre e processo servidor/script |
| `DESMEMBRAMENTO_SQLSERVER_CONNECTION_STRING` | conexão ODBC com a fonte Azure SQL | Somente cofre e processo de extração |
| `DESMEMBRAMENTO_SQLSERVER_SCHEMA` | schema da fonte | Processo de extração |
| `DESMEMBRAMENTO_SQLSERVER_OBJETO` | view ou tabela autorizada | Processo de extração |
| `DESMEMBRAMENTO_BANCO_FONTE` | identificação da fonte no pipeline | Processo de sincronização |

Arquivos privados usados em computadores operacionais:

- `.env.local`: configuração local do frontend; criar a partir de `.env.example` e nunca versionar.
- `.streamlit/secrets.toml`: configuração legada/local; nunca versionar.
- `dados/fonte_oficial.json`: seletor privado da fonte, com campos `fonte`, `usuario` e `python`; nunca versionar.

Não copie para a nuvem `dados/`, snapshots SQLite, planilhas, backups, dumps, logs, credenciais ou arquivos de clientes. A chave `SUPABASE_SERVICE_ROLE_KEY` nunca pode usar prefixo `VITE_`.

## Preparação e validação

```powershell
git fetch origin --prune
git switch codex/continuidade-ia
git pull --ff-only
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-local.txt
npm ci
python -m unittest discover -s tests -p "test_*.py"
node --test tests/reserva_pagina.test.mjs
npm run build
```

Em Linux, use o ativador e o executável Python próprios do sistema. A extração Azure também exige Microsoft ODBC Driver 18, `pyodbc`, DNS/rede autorizados e identidade válida.

## Limites seguros

- Sem segredos, o frontend pode compilar e testes puros podem rodar; integrações reais ficam indisponíveis.
- Não execute `ATUALIZAR_BASE_DIARIA.bat`, `--aplicar`, `--confirmar` ou SQL de instalação em um ambiente efêmero.
- `python scripts/atualizar_base_oficial.py --somente-simular` ainda escreve estágio e plano no Supabase. Só use com autorização e configuração administrativa correta.
- Antes de qualquer operação real, confirme a fonte exibida, a ausência de outra sincronização e um backup restaurável.
