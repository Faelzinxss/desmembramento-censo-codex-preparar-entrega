# Entrega do projeto

Preparação em 12/11/2026. Responsável futuro a definir. Este é o ponto de entrada da passagem.

## O que já está reunido

- Branch de entrega `codex/preparar-entrega`, reunindo o planejamento Azure de `1cdea36` e as melhorias de fila de `7938ef6`.
- Código, testes, dependências fixadas e instruções de instalação.
- Inventário de ativos e roteiro de transferência em [TRANSFERENCIA_E_CONTINUIDADE.md](TRANSFERENCIA_E_CONTINUIDADE.md).
- Operação da atualização em [OPERACAO_E_MIGRACAO.md](OPERACAO_E_MIGRACAO.md).
- Regras confirmadas em [DATA_RULES.md](DATA_RULES.md).
- Estado operacional conhecido em [CONTINUIDADE.md](CONTINUIDADE.md).

A referência de produção deve ser conferida no Cloudflare e no Supabase na data da entrega. O sucesso dos testes locais comprova a integração do código e precisa ser complementado por homologação.

## Serviços e dependências

| Serviço | Referência | Conferência para entrega |
|---|---|---|
| GitHub | `Faelzinxss/desmembramento-censo-codex-preparar-entrega` | Organização de destino, permissões e integração de publicação |
| Supabase | `iybqjvldjbknvglqqkdx` | Organização, titulares, cobrança, Auth, backups e definições SQL instaladas |
| Cloudflare | Worker `desmembramento-censo` | URL de produção, versão ativa, branch publicada, variáveis e cobrança |
| Azure SQL | `VISITAS_CENSO.dbo.vw_desmembramentos` | Responsável pela fonte, leitura individual autorizada, rede e suporte |
| Computador operacional | Windows, Python local, ODBC 18 e Azure CLI | Instalação e teste em outra máquina |
| Arquivos privados | Configuração, snapshots, logs e backups | Cofre e armazenamento corporativo restrito a definir |

O site é servido pelo Cloudflare e usa o Supabase. A atualização diária lê o Azure e depende do computador operacional e de autenticação autorizada.

## Preparar enquanto o sucessor está indefinido

- [x] Reunir as duas frentes de código em uma branch de entrega.
- [x] Identificar serviços, dependências e documentação.
- [ ] Revisar e integrar o PR de entrega em `main`.
- [x] Conferir versão ativa, build e conexão Git no Cloudflare em 12/11/2026.
- [x] Exportar inventário das funções públicas e dos catálogos de public, auth e storage.
- [ ] Completar o dump restaurável e validar permissões em restauração isolada.
- [x] Consultar as últimas cargas no servidor em 12/11/2026. Repetir na data da entrega.
- [ ] Definir armazenamento corporativo restrito para os arquivos privados.
- [x] Conferir leitura e integridade dos três últimos backups incrementais locais.
- [x] Ensaiar recuperação dos dados do backup incremental em PostgreSQL isolado, com conferência registro a registro.
- [ ] Conferir cópia externa e ensaiar recuperação integral do serviço.
- [ ] Registrar responsáveis institucionais por cobrança e recuperação.

Esses itens permitem preparar a entrega antes da escolha de uma pessoa. Administração, cobrança e armazenamento corporativo precisam ser definidos com a empresa.

## Arquivos privados a preservar

| Material | Local atual relativo ao projeto | Uso |
|---|---|---|
| Seletor de fonte | `dados/fonte_oficial.json` | Recriar para o computador e usuário novos |
| Configuração pública | `.env.local` | Configurar desenvolvimento e build |
| Configuração administrativa | `.streamlit/secrets.toml` ou variáveis do processo | Guardar no cofre com acesso restrito |
| Snapshots | Caminho registrado no manifesto da extração | Rastreabilidade e retomada da mesma fonte |
| Base preparada | `publicacao_drive/` | Conferir hash antes de retomar um plano |
| Logs e planos | `logs/` | Diagnóstico e comprovação das etapas |
| Backups incrementais | `backups/sincronizacoes_incrementais/` | Estado anterior dos itens abrangidos pela carga |

O backup incremental abrange os itens do plano. A recuperação integral exige também dados, Auth, Storage quando utilizado, esquema instalado, funções, RLS e configurações dos serviços. O roteiro de transferência detalha esse inventário.

## Operação no novo computador

1. Clonar a versão revisada do repositório.
2. Preparar Python pelo script `manutencao/PREPARAR_AMBIENTE_PYTHON.bat`.
3. Instalar/verificar ODBC 18 e Azure CLI.
4. Configurar a fonte oficial e o acesso Azure do operador.
5. Configurar variáveis administrativas via cofre aprovado.
6. Executar testes locais e uma simulação autorizada conforme o manual.
7. Revisar o plano e executar uma atualização acompanhada, com backup.
8. Conferir a finalização, os contadores e uma amostra funcional.

A simulação escreve estágio e plano no Supabase. Coordenar uma execução por vez, inclusive entre computadores.

## Publicação e recuperação

Antes de publicar, registrar a versão ativa e validar `npm run build` e os testes Node. Publicar uma versão de frontend e instalar SQL são operações distintas. O conjunto de arquivos SQL contém histórico e correções pontuais. Uma reconstrução exige inventário do banco instalado.

Para incidentes, preservar mensagem, etapa, horário, carga e versão. Consultar o estado remoto antes de repetir gravações após timeout. Reservas e alterações durante a aplicação podem deixar carga parcial.

## Quando houver uma pessoa definida

- [ ] Registrar titular, substituto e contatos de suporte.
- [ ] Conceder acessos individuais e testar recuperação autorizada.
- [ ] Entregar arquivos privados pelo canal corporativo.
- [ ] Testar login, abertura de caso, reserva, links e salvamento.
- [ ] Fazer atualização supervisionada com a identidade do sucessor.
- [ ] Ensaiar publicação e retorno a versão conhecida em ambiente isolado.
- [ ] Conferir cobrança e aceite formal.
- [ ] Ajustar acessos anteriores após o aceite.

A entrega estará concluída quando o sucessor conseguir operar, publicar e recuperar o projeto com seus próprios acessos.

## Validação desta preparação

Em 12/11/2026, a branch reunida passou em 90 testes Python, 39 testes Node e no build Vite. O Git diff foi conferido. Foram feitas instalação de dependências e integração de código em cópia isolada.

O último resultado operacional comprovado neste acompanhamento foi a carga de 10/11, parcial por reservas. Foram aplicadas 10.764 matrículas e 100.633 casos, com 76.787 desativações e 74 preservações por revisão na aplicação. O estado atual e eventuais cargas posteriores precisam ser consultados na entrega.

O build local foi executado sem configuração privada de produção. A validação de login e conexão depende das variáveis do ambiente autorizado.

A restauração integral, a versão servida pelo Cloudflare, a configuração de cobrança e a cópia dos arquivos privados para armazenamento corporativo permanecem pendentes de comprovação.

## Conferência de 12/11/2026

O PR [4](https://github.com/Faelzinxss/desmembramento-censo-codex-preparar-entrega/pull/4) está aberto em rascunho, com integração possível e revisão pendente. A versão reunida está publicada na branch de entrega.

Consulta GET ao Supabase confirmou as cargas de 09, 10 e 11/11 em `enviando`. O log local de 11/11 registra 7.464 matrículas e 126.163 casos enviados, 59.590 desativações, 131 preservações por revisão e dois adiamentos por reserva. Esses estados precisam ser acompanhados pela operação antes de declarar encerradas as cargas.

| Backup incremental | Matrículas existentes | Casos existentes | Itens do plano | Verificação local |
|---|---:|---:|---:|---|
| 11/11/2026 | 4.350 | 158.793 | 193.350 | Gzip legível, SHA-256 interno válido e chaves únicas |
| 10/11/2026 | 4.734 | 150.545 | 188.260 | Gzip legível, SHA-256 interno válido e chaves únicas |
| 09/11/2026 | 5.477 | 141.199 | 179.162 | Gzip legível, SHA-256 interno válido e chaves únicas |

A verificação local comprova a integridade do conteúdo gravado. A recuperação em PostgreSQL e a cópia corporativa ainda aguardam execução.

O responsável atual informou que o destino corporativo dos arquivos privados está a definir. Registrar a pasta aprovada e seus responsáveis antes de copiar arquivos.

## Pendências técnicas para recuperar o ambiente

1. Exportar de forma autorizada o esquema efetivamente instalado, incluindo funções, índices, constraints, gatilhos, RLS e grants. Usar os inventários existentes em `sql/INVENTARIAR_TABELAS_ATUAIS.sql` e `sql/EXPORTAR_FUNCOES_FILA_ATUAL.sql` como apoio. Conferir a cobertura antes de tratar o resultado como exportação integral.
2. Conferir no painel Supabase quais backups completos estão disponíveis e quais componentes cobrem.
3. Conferir Auth, redirects, SMTP e Storage quando utilizado. Registrar configurações no armazenamento restrito.
4. Restaurar uma cópia em PostgreSQL isolado com acesso adequado e validar dados, permissões e funções.
5. Registrar o commit servido em produção e as instruções de retorno a uma versão conhecida no Cloudflare.

Uma checagem adicional da versão por RPC foi rejeitada pela revisão automática por possível escrita em produção. A conferência foi limitada ao GET das cargas. A versão instalada do planejador conserva como referência a validação de 10/11.

As próximas ações em contas externas são a consulta e exportação das configurações instaladas. A integração de código em `main` depende de revisão e da conferência do efeito sobre a publicação automática.

## Exportação dos catálogos instalada em 12/11/2026

Exportação obtida por consultas SELECT no SQL Editor do projeto de produção e salva em `backups/entrega_20261112/`, fora do Git. CSVs originais preservados, JSON decodificado e manifesto com hashes SHA-256 gerados localmente.

| Item exportado | Quantidade |
|---|---:|
| Funções públicas com definição, proprietário e ACL | 84 |
| Funções de auth e storage | 28 |
| Relações nos três schemas | 78 |
| Colunas | 619 |
| Constraints | 211 |
| Índices | 219 |
| Gatilhos de usuário | 31 |
| Políticas RLS | 16 |
| Entradas de enum | 29 |
| Sequências | 7 |
| Views/materialized views | 1 |
| ACLs de coluna explícitas | 1 |
| ACLs padrão | 24 |

Foram preservados também schemas, extensões e tabelas publicadas. Contagens refletem os objetos visíveis à sessão de exportação. O inventário ajuda a conferir as definições instaladas e ainda exige um dump restaurável com dependências e um ensaio de recuperação para comprovar reconstrução integral. Dados de tabelas, contas Auth, arquivos Storage, configurações externas e valores correntes de sequências exigem cobertura própria.

A primeira consulta agregada provocou travamento da exibição do resultado no navegador. A exportação foi concluída em outra aba, dividida em funções e catálogos, e os dois arquivos foram validados localmente.

O painel Cloudflare pediu login no navegador integrado. Conferência da versão publicada aguarda a autenticação pelo responsável.

## Cloudflare e backups gerenciados conferidos em 12/11/2026

- Produção em `desmembramento-censo.deepessoas.workers.dev`, versão `7dd4a958`, com 100% do tráfego. O rótulo da versão referencia `7c9bf38`, redução de buscas repetidas na fila, enviada por Wrangler.
- O repositório conectado é `Faelzinxss/desmembramento-censo-codex-preparar-entrega`. A branch de produção configurada é `main`. Builds de outras branches estão habilitados.
- Build `npm run build`, deploy de produção `npx wrangler deploy`, comando de versões `npx wrangler versions upload`, raiz `/` e cache de build habilitado.
- Variáveis públicas de build identificadas pelos nomes `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Valores ficam nas configurações autorizadas.
- O commit da preparação `f89d6a7` produziu a versão `2b6f0728`, com status Ready. Essa versão aguarda revisão e promoção.
- O Worker serve assets estáticos, sem bindings. O painel mostrou ausência de domínio personalizado e de rotas adicionais.
- Supabase mostrou oito backups físicos diários disponíveis, de 05 a 12/11. O mais recente estava datado de 12/11/2026 às 13h18min19s UTC, equivalente a 10h18min19s de São Paulo.
- O painel informa que os arquivos de Storage ficam fora desses backups. A recuperação desses arquivos exige plano próprio quando utilizados.
- O teste de restauração permanece pendente. A presença de botões Restore comprova disponibilidade no painel e precisa ser complementada pelo ensaio em ambiente isolado.

O acesso ao Cloudflare foi autenticado pelo responsável para esta conferência. Os dados de publicação foram consultados no painel.

## Ensaio de recuperação incremental em 12/11/2026

O backup de 11/11 foi carregado em PGlite local, baseado em PostgreSQL, sem conexão de rede ao banco de produção. As tabelas casos e matriculas foram criadas com os tipos das colunas do inventário exportado e suas chaves primárias. Foram recuperadas 4.350 matrículas e 158.793 casos.

Cada lote foi comparado entre o conteúdo tipado do backup e os registros gravados. Resultado de zero registros divergentes, contagens iguais e chaves únicas. Relatório privado em `backups/entrega_20261112/ensaio_restauracao_incremental.json`, com identificação e hash do arquivo original.

O ensaio cobre a leitura e recuperação dos dados anteriores dos itens do plano. Demais constraints, funções, gatilhos, RLS, Auth, Storage e configurações de plataforma precisam de ensaio próprio com dump completo e dependências.

Na conferência do conjunto do PR, `git diff --check origin/main...HEAD` apontou linhas vazias ao final de dois SQLs históricos, herdadas das branches anteriores. As alterações documentais atuais passaram em `git diff --check`. A revisão técnica completa e o aceite do PR permanecem pendentes.

## Revisão da preparação em 12/11/2026

Foram conferidos os caminhos de atualização, identificação da fonte, retomada em etapas, proteção de reservas e as alterações de busca e assinatura da fila reunidas no PR.

Foi corrigida a validação do simulador para rejeitar cargas em estado inválido antes de reenviar o estágio. A cobertura de regressão verifica geração completa em três etapas, retomada parcial sem novo upload, falha de finalização sem gerar arquivo aplicável e rejeição antecipada de carga marcada como falhou.

A validação Python passou em 94 testes. Os testes de integração do planejamento contra PostgreSQL isolado realizados na implementação e o ensaio incremental estão descritos nas seções anteriores. Testes locais com mocks verificam a orquestração e precisam ser complementados pelas garantias instaladas no servidor.

A revisão humana para integração em main segue pendente. Essa integração pode acionar publicação automática pela configuração atual do Cloudflare. O estado ativo foi registrado para permitir conferência e retorno pela operação.
