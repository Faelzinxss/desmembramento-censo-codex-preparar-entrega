# Continuidade do projeto

Atualizado em **24/10/2026**. Este arquivo descreve o checkout atual; confirme serviços externos antes de operar produção.

O resumo curto e vigente para retomar em outro computador está em `docs/CONTINUIDADE.md`. As seções abaixo mantêm detalhes de acompanhamento; relatos encerrados pertencem a `CHANGELOG.md`, `docs/historico/` ou `historico/contexto/`.

## Em andamento

- Revisão da entrega corrigiu estado inválido do simulador antes do upload. Revisão humana do PR 4, recuperação integral e destino corporativo seguem pendentes.

- Recuperação dos dados do backup incremental ensaiada em 12/11. Completar dump e ensaio integral com RLS/Auth/Storage.

- Inventário Supabase exportado em 12/11 e validado localmente. Completar dump restaurável, testar recuperação e conferir Cloudflare após login.

- Entrega em preparação. Backups locais de 09–11/11 íntegros. Conferir recuperação isolada, esquema instalado e publicação. A empresa ainda definirá destino dos arquivos privados.

- Preparação de entrega sem sucessor definido. Código reunido na branch `codex/preparar-entrega`. Conferências e aceite em `docs/ENTREGA_PROJETO.md`.

- Acompanhar as próximas cargas Azure pelo botão diário. Em caso de interrupção após gerar a lista de mudanças, o mesmo manifesto permite retomar o cálculo de totais.

- Regra confirmada em 22/10: lote com matrícula que permanece vermelha após o preenchimento deve ficar pendente de verificação; conferir mensagem de validação e possível falta de CPF. Documentada em `docs/DATA_RULES.md`; detecção automática depende de identificar a tela e o retorno de validação.

- Acompanhar no aplicativo os contadores e uma amostra dos casos reativados, atualizados e arquivados pela carga verificada de 24/10.
- No computador da empresa, executar `manutencao\PREPARAR_AMBIENTE_PYTHON.bat`, confirmar ODBC Driver 18 e instalar o Azure CLI antes da próxima atualização.
- Validar no outro computador o primeiro login web no tenant solicitado; a rotina não deve usar token de outro tenant.

## Próximos passos

1. Revisar os SQLs locais e separar instalação vigente, diagnóstico e experimento antes de qualquer aplicação.
2. Fazer uma simulação Azure com snapshot atual e conferir plano, arquivamentos, reservas adiadas e volume.
3. Validar backup/restauração em ambiente isolado e registrar evidência.
4. Mesclar a branch somente após revisão; depois confirmar o commit efetivamente servido pelo Cloudflare.
5. Definir com TI identidade não interativa, rede, cofre e executor antes de criar atualização noturna.

## Bugs conhecidos

- **Média — portabilidade:** `scripts/sincronizar_base.py` e `ferramentas/inspecionar_municipio.py` ainda contêm caminho absoluto de um usuário como fallback/exemplo. O fluxo configurado por ambiente continua funcional.
- **Operacional — carga parcial:** a documentação de 15/10 registra uma aplicação Azure parcial. O estado remoto não foi consultado nesta sessão.
- **Operacional — SQL divergente:** a pasta `sql/` contém versões históricas e correções pontuais; o conjunto não representa uma migração limpa e sequencial do banco atual.

## Melhorias futuras

- Exportar e versionar um inventário sanitizado das RPCs, triggers, índices, RLS e grants realmente instalados.
- Dividir gradualmente `src/main.jsx` por domínio, somente com testes de comportamento e sem alterar regras na mesma entrega.
- Adicionar CI para testes e build; separar completamente CI de qualquer escrita em produção.
- Preparar automação noturna com identidade corporativa mínima, trava distribuída, alertas, retenção de logs e aprovação do plano.
- Medir carga com 10, 20 e 50 sessões em ambiente representativo antes de afirmar capacidade.

## Última sessão

### O que foi feito

- A atualização Azure de 24/10 foi extraída, planejada, respaldada, aplicada e verificada em produção. A carga terminou com 197.537 casos ativos e temporários zerados.
- O login passou a usar Azure CLI com seleção explícita do tenant da fonte; o token é mantido fora do Git e entregue ao ODBC somente em memória.
- O ambiente Python deixou de depender de uma `.venv` sincronizada ou do caminho absoluto de outro usuário; cada Windows usa `%LOCALAPPDATA%`.
- Neste computador foram instalados e validados `requests`, `pyodbc` e Microsoft ODBC Driver 18.7.1.1, sem executar carga ou escrita no Supabase.
- O repositório foi comparado ao GitHub; `origin/main` avançou de `213fe92` para `f3da4b7`.
- O commit remoto de documentação foi integrado sem descartar as alterações locais do computador da empresa.
- O projeto, as rotinas Azure, as regras de dados, os contratos de reserva e a documentação existente foram analisados.
- Foram criados os documentos de continuidade para IA/Git/múltiplos computadores e revisados `.env.example` e `.gitignore`.
- A varredura rápida não encontrou segredo versionado; encontrou um arquivo local ignorado de segredos, que deve permanecer fora do Git, e caminhos pessoais hardcoded.

### Principais arquivos alterados

- documentação: `README.md`, `AGENTS.md`, `TODO.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/DATA_RULES.md`, `docs/DECISIONS.md`;
- ambiente: `.env.example`, `.gitignore`;
- trabalho recuperado: scripts de Azure/sincronização, SQLs de planejamento/política/links, `src/main.jsx` e testes associados.

### Estado atual

- Branch: `codex/continuidade-ia`, baseada em `origin/main` no commit `f3da4b7`.
- A implementação recuperada foi preservada no commit local `5c2af52`.
- A confirmação da transição de estado foi corrigida e passou a rejeitar uma carga alterada por outra execução.
- Validação: 90 testes Python, 27 testes Node e `npm run build` aprovados.
- Nenhum SQL ou deploy foi executado. A carga incremental `e90baca0-f7b4-4fbf-8a79-873e705305d6` foi aplicada e verificada no Supabase.
- O stash de segurança foi comparado com o commit remoto e não contém trabalho adicional a recuperar.

### Próximo passo recomendado

Publicar e revisar a branch. No computador da empresa, buscar a branch, instalar/preparar Python, ODBC e Azure CLI e validar o primeiro login no tenant solicitado antes da próxima atualização.
