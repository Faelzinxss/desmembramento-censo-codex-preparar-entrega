# Continuidade entre computadores

Atualizado em **12/11/2026**. Este é o resumo operacional vigente. Os relatos anteriores permanecem separados em [Registros históricos](#registros-historicos).

## Estado atual

- Revisão de 12/11 da branch de entrega corrigiu rejeição antecipada de carga em estado inválido no simulador. Acrescentados quatro testes de regressão da orquestração de planejamento e retomada. A integração em main depende da revisão humana e da conferência da publicação automática.

- Em 12/11, ensaiada a recuperação do backup incremental de 11/11 em PostgreSQL local isolado. Recuperadas 4.350 matrículas e 158.793 casos, sem divergência registro a registro. Relatório privado em `backups/entrega_20261112/`. O ensaio integral do serviço exige dump e dependências adicionais.

- Conferência de 12/11 no Cloudflare confirmou produção na versão `7dd4a958` (rótulo `7c9bf38`), com 100% do tráfego. A branch `main` publica por `wrangler deploy`; outras branches geram versões. A preparação `f89d6a7` teve build Ready na versão `2b6f0728`. Supabase mostrou backups físicos de 05–12/11. Recuperação isolada e arquivos Storage continuam pendentes.

- Em 12/11, exportadas e validadas 84 funções públicas e 15 categorias de catálogos dos schemas public/auth/storage. Arquivos privados e manifesto em `backups/entrega_20261112/` no computador operacional. Esta é uma exportação de inventário, com recuperação integral ainda pendente. O Cloudflare pediu login para conferir a versão publicada.

- Em 12/11, verificada a integridade dos backups incrementais locais de 09, 10 e 11/11. GET ao Supabase confirmou essas cargas em `enviando`. PR 4 consultado, em rascunho e sem conflitos de integração. O destino corporativo dos arquivos privados foi informado como a definir. Detalhes em `ENTREGA_PROJETO.md`.

- Preparação de entrega na branch `codex/preparar-entrega`, reunindo planejamento Azure e correções de fila. Consulte `ENTREGA_PROJETO.md` para os itens concluídos e pendentes. O responsável futuro e o armazenamento corporativo dos arquivos privados seguem a definir.

- Em 10/11/2026, a versão 2 do planejador foi confirmada no Supabase. A carga de estágio existente chegou a `planejada` após as três etapas. O plano prevê 26.951 casos novos, 36.277 reativações, 37.406 atualizações e 76.862 desativações, das quais 62.075 são arquivamentos de ausentes do Azure. O backup e a aplicação aguardam confirmação do operador.

- Em 10/11/2026, a carga Azure expirou no cálculo de totais depois do envio completo ao estágio. A migração de planejamento em duas etapas foi instalada e a versão da RPC foi confirmada pela API. O simulador foi incorporado à rotina diária neste computador. Na retomada, a primeira etapa expirou ao calcular os arquivamentos do Azure. O ajuste complementar separa esse cálculo em uma terceira chamada e passou na validação em PostgreSQL isolado. Esse ajuste complementar foi instalado e validado com a carga em produção.

- Em 24/10/2026, a atualização Azure carga `e90baca0-f7b4-4fbf-8a79-873e705305d6` foi concluída e verificada. Resultado: 197.537 casos ativos; 16.622 matrículas e 102.441 casos enviados; 54.145 casos desativados, dos quais 49.442 ausentes foram arquivados; 62.300 ausentes foram preservados; nenhuma alteração ficou adiada por reserva; tabelas temporárias zeradas.
- A regra de fila foi mantida: 108.459 casos sujeitos ao corte abaixo de 80% ficaram fora da fila durante a preparação.
- A autenticação agora usa Azure CLI com o tenant da fonte selecionado explicitamente. Isso substitui o caminho que falhava no WAM (`0x534`) e impede token do tenant errado (`18456`).
- Em 22/10/2026, foi registrada a regra operacional de manter pendente de verificação o lote com matrícula que continua vermelha no envio após o preenchimento. Ausência de CPF é uma possível causa a conferir. A regra está em `docs/DATA_RULES.md`; não foi implementada detecção automática nem houve ação externa nessa alteração documental.

- O GitHub `joaochvs/desmembramento-censo` é a referência compartilhada entre casa, empresa e ambiente em nuvem.
- A branch de preparação é `codex/continuidade-ia`, criada sobre `origin/main` em `f3da4b7`.
- A branch preserva a integração Azure recuperada neste computador, as correções de links e planejamento, a documentação para continuidade e uma correção de concorrência na confirmação da carga.
- Nenhum SQL ou deploy foi executado nesta sessão. A atualização incremental descrita acima alterou a base de produção e gerou backup local antes da aplicação.
- Não há workflow em `.github/workflows` nem status check associado à branch. `wrangler.jsonc` descreve a aplicação Cloudflare, mas a regra externa de branches do Cloudflare ainda precisa ser confirmada no painel.
- O Python operacional agora é preparado separadamente em cada Windows, fora da pasta do OneDrive. Um caminho `python` antigo em `dados/fonte_oficial.json` deixa de bloquear a atualização quando existe um Python local funcional.
- As falhas anteriores `40613`, `0x534` e `18456` ficaram registradas como diagnóstico. A execução final de 24/10 concluiu extração, estágio, planejamento, backup, aplicação e verificação.

## Decisões vigentes

- Trabalhar sempre em branch publicada e integrar `main` somente por PR revisado.
- Guardar no Git apenas código, migrações revisáveis, testes e documentação sanitizada.
- Manter segredos, snapshots, bases, dados pessoais, backups e logs fora do repositório.
- Tratar GitHub, Supabase e Cloudflare como estados diferentes: commit não instala SQL e build local não prova deploy.
- Preservar reserva exclusiva, validação antes de abrir/salvar, idempotência e histórico apenas para mudança real.
- A sincronização permanece incremental e conservadora. Arquivamento de ausentes, corte de similaridade e contrato da fonte exigem confirmação humana.

## Pendências e próximos passos

1. No computador da empresa, buscar esta branch e comparar qualquer alteração local antes de integrar.
2. Acompanhar no aplicativo os contadores e uma amostra dos casos reativados, atualizados e arquivados pela carga de 24/10.
3. Inventariar de forma sanitizada as RPCs, triggers, índices, RLS e grants instalados; arquivos SQL locais não comprovam o estado da produção.
4. Executar nova simulação com snapshot atual e revisar volume, arquivamentos e reservas antes de qualquer aplicação.
5. Confirmar no Cloudflare que somente `main` publica produção e definir a política desejada para previews de PR/branch.
6. Validar backup e restauração em ambiente isolado.
7. Para atualização noturna, definir com TI identidade não interativa, acesso de rede, cofre de segredos, trava distribuída e alertas.
8. Em cada computador Windows, executar `manutencao\PREPARAR_AMBIENTE_PYTHON.bat` uma vez e confirmar a presença do Microsoft ODBC Driver 18. O botão diário também prepara o Python automaticamente.
9. No primeiro uso em outro Windows, instalar o Azure CLI e concluir o login web no tenant solicitado pelo botão. Não copiar cache de autenticação entre computadores.

## Validação desta preparação

- 90 testes Python aprovados.
- 27 testes Node aprovados.
- `npm run build` aprovado; permanece apenas o aviso de bundle JavaScript acima de 500 kB.
- `git diff --check` aprovado.
- Conexão Azure, extração, escrita incremental no Supabase e verificação da carga foram executadas com sucesso em produção.
- Não houve teste real de concorrência com 50 pessoas, restauração do backup ou deploy.

## Diferenças conhecidas

| Local/GitHub/produção | Situação |
|---|---|
| Checkout deste computador | Python local preparado e ODBC Driver 18.7.1.1 instalado; correção de portabilidade incorporada à branch. Existe um stash de segurança mantido deliberadamente. |
| `origin/main` | Ainda está em `f3da4b7` e não contém o trabalho da branch. |
| Computador da empresa | Executar o preparador local e confirmar o ODBC Driver 18; pode conter configuração privada, dados ignorados e alterações posteriores. |
| Ambiente em nuvem | Pode clonar e testar o código, mas não possui automaticamente ODBC, acesso Azure, dados locais ou segredos. |
| Supabase de produção | Carga `e90baca0-f7b4-4fbf-8a79-873e705305d6` verificada em 24/10; RPCs, triggers, RLS e grants ainda precisam de inventário sanitizado. |
| Cloudflare de produção | O commit servido e a política externa de branches precisam ser confirmados no painel. |

## Como retomar

```powershell
git fetch origin --prune
git switch codex/continuidade-ia
git pull --ff-only
git status --short --branch
```

Se houver mudanças locais no outro computador, não execute `pull` às cegas. Primeiro faça commit local ou um stash identificado, compare com `origin/codex/continuidade-ia` e integre preservando os dois trabalhos.

## Registros históricos

- [TODO.md](../TODO.md) mantém riscos e tarefas detalhadas.
- [CHANGELOG.md](../CHANGELOG.md) registra entregas por data.
- [docs/TRANSFERENCIA_E_CONTINUIDADE.md](TRANSFERENCIA_E_CONTINUIDADE.md) contém a passagem operacional anterior.
- `docs/historico/` e `historico/contexto/` contêm relatos encerrados e não devem ser tratados como instruções vigentes.
