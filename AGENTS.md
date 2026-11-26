# Instruções para agentes de IA

Este repositório contém um aplicativo em produção e rotinas que escrevem no Supabase. Trate comandos de aplicação, SQL, backup, criação de usuários e publicação como operações distintas. Leia a documentação vigente e confirme o estado real antes de concluir que uma migração foi instalada ou que uma carga terminou.

## Arquitetura geral

- `src/main.jsx` concentra as telas e a orquestração do frontend; `src/reservaPagina.js` concentra persistência local, exclusão por aba, rascunho e retomada.
- `src/supabase.js` cria o cliente público com variáveis `VITE_*`.
- `scripts/extrair_fonte_sql_server.py` lê a view Azure e gera um snapshot validado.
- `scripts/sincronizar_base.py` normaliza linhas em matrículas e pares.
- `scripts/preparar_base_web.py` gera a base intermediária e o manifesto.
- `scripts/simular_sincronizacao_estagio.py`, `backup_plano_estagio.py`, `aplicar_sincronizacao_estagio.py` e `verificar_sincronizacao_estagio.py` implementam o ciclo de carga.
- O Supabase aplica autenticação, RLS, RPCs, reservas, idempotência e histórico. O frontend não é autoridade de concorrência.
- Cloudflare publica o conteúdo de `dist/` como SPA.

Detalhes e diagrama: `docs/ARCHITECTURE.md`.

## Antes de alterar código

1. Leia README.md
2. Leia docs/CONTINUIDADE.md
3. Leia TODO.md
4. Leia docs/ARCHITECTURE.md
5. Leia docs/DATA_RULES.md
6. Leia docs/DECISIONS.md
7. Para ambiente novo ou nuvem, leia docs/DESENVOLVIMENTO_NUVEM.md.
8. Procure primeiro se já existe implementação semelhante.
9. Não altere regras de negócio silenciosamente.
10. Prefira alterações pequenas e incrementais.
11. Após mudanças relevantes, atualize docs/CONTINUIDADE.md, TODO.md e CHANGELOG.md quando aplicável.

## Procedimento ao iniciar em qualquer ambiente

1. Execute `git status --short --branch` e preserve qualquer alteração encontrada. Nunca use `reset --hard`, limpeza de arquivos ou force push para sincronizar computadores.
2. Execute `git fetch origin --prune`.
3. Consulte `git log --oneline --decorate -10 --all` e `git diff --stat origin/main...HEAD` antes de integrar mudanças.
4. Se o checkout estiver limpo, abra a branch de trabalho publicada no GitHub. Se houver trabalho local, registre-o em commit próprio ou stash identificado antes de trocar de branch.
5. Atualize a branch com `origin/main` somente depois de revisar as diferenças. Resolva conflitos preservando as duas intenções; não substitua arquivos inteiros sem comparar.
6. Confirme em `docs/CONTINUIDADE.md` o que depende do computador da empresa, da nuvem e do estado real do Supabase.
7. Crie uma branch `codex/<assunto>` para uma nova frente. Não trabalhe diretamente em `main`.

## Padrões e convenções

- Interface e mensagens ao usuário ficam em português; nomes técnicos seguem o padrão já usado pelo módulo.
- Python usa `pathlib`, funções pequenas, mensagens explícitas e modos seguros por padrão. A simulação deve continuar diferente da aplicação.
- Registros vindos da fonte são normalizados antes do envio. Centralize regras da fonte em `scripts/regras_fonte.py` e `scripts/sincronizar_base.py`; não replique classificações no frontend.
- Preserve `caso_id` determinístico e os hashes usados pela sincronização. Mudar sua formação pode duplicar toda a fila.
- No frontend, preserve a validação da reserva imediatamente antes de abrir o Backoffice ou salvar.
- Toda repetição de uma gravação deve manter idempotência. Não implemente retry cego em resposta 500/timeout quando o servidor pode ter feito commit.
- Evite duplicar RPCs, helpers de reserva, regras de perfil ou transformações de dados. Pesquise em `src/`, `scripts/` e nas migrações mais recentes.
- SQL novo deve ter pré-condições, permissões explícitas, verificação final e caminho de rollback quando aplicável. Não edite migrações já aplicadas para representar um estado novo.

## Regras que exigem confirmação

Não altere sem confirmação humana explícita:

- corte de similaridade, classificação dos status ou identidade do par;
- política de arquivamento/desativação de ausentes;
- autorização por perfil, RLS, grants ou `security definer`;
- duração, renovação e abrangência das reservas;
- idempotência, histórico de reavaliação e critérios de produtividade;
- fonte oficial, view Azure, contrato de colunas e relação dos links A/B;
- exclusão/restauração de dados, aplicação em produção, publicação ou custos;
- segredos, contas, domínio, cobrança e infraestrutura externa.

Nunca envie `.env*`, `.streamlit/secrets.toml`, `dados/`, `backups/`, `logs/`, snapshots, dumps ou arquivos de clientes ao Git. Nunca mostre valores de credenciais em logs ou respostas.

## Comandos importantes

```powershell
npm ci
npm run dev
npm run build
python -m unittest discover -s tests -p "test_*.py"
node --test tests/reserva_pagina.test.mjs
python scripts/atualizar_base_oficial.py --somente-simular
```

O último comando escreve estágio e plano no Supabase, embora não altere casos e matrículas. Não use `ATUALIZAR_BASE_DIARIA.bat`, `--aplicar`, `--confirmar` ou SQL de instalação apenas para validar documentação.

## Como validar uma mudança

1. Execute os testes específicos do módulo alterado.
2. Para frontend, execute os testes Node e `npm run build`.
3. Para Python, execute toda a suíte com as dependências de `requirements-local.txt`.
4. Para SQL, valide sintaxe e comportamento em ambiente isolado com usuário autenticado real; mocks não comprovam RLS nem concorrência.
5. Compare dados antes/depois, permissões, planos de consulta e impacto em reservas.
6. Registre o que foi validado localmente e o que ainda depende de produção.

## Regras de negócio

`docs/DATA_RULES.md` é o índice das regras confirmadas. Se código, documentação e banco divergirem, pare e marque `PENDENTE DE CONFIRMAÇÃO`; a definição instalada no Supabase precisa ser inventariada antes de substituir arquivos. Não deduza regra a partir de um nome de tabela ou de um SQL histórico.

## Continuidade entre sessões

Ao finalizar uma sessão relevante:
- atualizar TODO.md;
- registrar bugs conhecidos;
- registrar o que foi concluído;
- registrar o próximo passo recomendado;
- registrar decisões importantes em docs/DECISIONS.md;
- não deixar informações importantes apenas no chat.

Além disso, deixe a árvore Git compreensível: informe branch, último commit, arquivos não commitados, testes executados e se houve qualquer ação externa. Um `true` de existência de função não comprova que a regra, desempenho ou permissão funcionam.

## Procedimento ao encerrar

1. Rode os testes proporcionais à mudança e registre também o que não pôde ser verificado.
2. Atualize `docs/CONTINUIDADE.md` com estado atual, pendências, diferenças entre local/GitHub/produção e ações externas realizadas. Mova relatos antigos para a seção histórica ou para `historico/`.
3. Confira `git status`, `git diff --check` e a ausência de segredos, dados, backups e logs no conjunto que será commitado.
4. Faça commit descritivo e publique a branch. Abra ou atualize um PR para `main`; não faça merge sem revisão.
5. Registre branch, commit, PR, testes e itens que o próximo computador precisa conferir.
