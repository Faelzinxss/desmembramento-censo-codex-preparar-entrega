# Transferência de responsabilidade e continuidade

Revisão: **15/10/2026**. Objetivo: outra pessoa conseguir manter a operação mesmo que João deixe de ser o responsável. Este plano não executa transferências nem autoriza troca de proprietário, credenciais ou infraestrutura.

## 1. Situação e decisão necessária

Preparação de 12/11/2026 disponível em [ENTREGA_PROJETO.md](ENTREGA_PROJETO.md). O sucessor continua a definir.

João informou que **GitHub, Cloudflare e Supabase estão em suas contas pessoais**. Arquivos operacionais e conhecimento também estão concentrados nele. Não está confirmado quem detém a administração/billing do Azure SQL corporativo, domínio/DNS ou e-mail transacional.

A prioridade é transferir a custódia e tornar a operação reproduzível. Isso não exige trocar imediatamente o banco, criar um projeto Supabase novo ou mudar a URL do aplicativo. Primeiro avaliar, com TI e os administradores dos serviços, como manter os recursos existentes sob administração corporativa. Se algum recurso exigir recriação, tratar como migração separada e homologada.

**Não entregar a senha da conta pessoal, seus códigos MFA ou a caixa de e-mail pessoal.** O sucessor deve ter sua própria identidade e acesso autorizado. Não excluir contas/projetos, cancelar cobrança, revogar João ou rotacionar chaves em uso antes de validar os substitutos e o plano de retorno.

## 2. Responsáveis a nomear pela empresa

| Papel | Responsabilidade | Nome/contato |
|---|---|---|
| Dono do produto/operação | Aprovar regras, prioridades e janela de manutenção | A definir |
| Responsável técnico titular | Código, publicação, atualização e incidentes | A definir |
| Substituto técnico | Conseguir operar sem depender do titular | A definir |
| TI/administrador Azure | Identidade, rede e leitura da view | A confirmar |
| Responsável pela fonte | Confirmar conclusão e qualidade da carga Azure | A confirmar |
| Administrador de plataformas/cobrança | Recuperação, MFA, billing e disponibilidade | A definir |
| Responsável pelos dados/segurança | Acesso, retenção, backups e transferência segura | A definir |

Hoje João acumula a custódia dos três serviços. Isso não deve ser confundido com confirmação de que ele administra a infraestrutura corporativa Azure.

## 3. Inventário obrigatório de ativos

Preencher os campos pendentes em registro corporativo de acesso restrito. Este documento não deve receber senhas, tokens, documentos de cobrança ou códigos de recuperação.

| Ativo | Referência conhecida | Completar antes da entrega |
|---|---|---|
| GitHub | `github.com/joaochvs/desmembramento-censo`, `main`; conta pessoal | Organização de destino, titular/substituto, visibilidade, regras da branch, integrações, recuperação |
| Cloudflare | `wrangler.jsonc`: Worker `desmembramento-censo`, assets `dist/`; conta pessoal | ID de conta/Worker efetivo, URL de produção, domínio/zone/DNS, integração Git, configurações de build, variáveis, billing |
| Supabase | Projeto `iybqjvldjbknvglqqkdx`; conta pessoal | Organização, administradores, plano/billing, URL/região, Auth/SMTP/redirects, backups disponíveis, políticas e credenciais |
| Azure SQL | `bdcenso.database.windows.net` / `VISITAS_CENSO` / `dbo.vw_desmembramentos` | Dono do recurso/view, contato de suporte, refresh upstream, grupos de leitura, firewall/rede e custos |
| Login Azure atual | Conta corporativa de João com autenticação interativa | Acesso individual do sucessor ou identidade técnica aprovada; nunca depender da sessão de João |
| Computador de operação | Checkout local e Python/ODBC | Máquina alternativa, caminhos válidos, permissões de instalação e pessoa autorizada a executar |
| Dados locais | `dados/`, `publicacao_drive/`, logs e backups, fora do Git | Local corporativo restrito de cópia, retenção, tamanho, integridade e restauração |
| Segredos | Configuração privada Supabase e eventual conexão SQL | Cofre corporativo, responsáveis, consumidores e plano de rotação |
| E-mail/domínio | Recuperação de usuários e endereço do aplicativo | SMTP, remetente, DNS, renovação, contatos e redirecionamentos Auth |

O acesso ao GitHub não transfere automaticamente Cloudflare, Supabase, Azure, backups ou a capacidade de recuperar contas. Convites de colaborador também não comprovam transferência de propriedade/billing. Conferir permissões efetivas e os procedimentos vigentes de cada serviço antes de agir.

## 4. Pacote de entrega

### Código e definições, sem dados pessoais

- Repositório, branch/commit de referência e histórico, lockfiles e documentação.
- Revisão dos arquivos locais ainda não versionados: leitor e entrada Azure, política de ausentes, correção de links e planejamento. Não copiar apenas o `main` e presumir que tudo está nele.
- Lista de scripts SQL efetivamente aplicados, data/operador/evidência e reversão. Exportação autorizada do esquema **instalado**: tabelas, índices, constraints, funções, triggers, grants e RLS. Os SQLs antigos do Git não substituem essa exportação.
- Configurações não secretas de build, nomes de variáveis e descrição de cada consumidor.

Antes de versionar: inspecionar `git status`, diff e arquivos não rastreados; separar alterações alheias; verificar dados/segredos. Se a entrega urgente usar patch ou cópia do checkout, registrar commit-base e diferenças, por canal corporativo restrito. Isso não substitui a revisão posterior.

### Arquivos e informações privados, fora do Git

- Backups operacionais e incrementais, fontes/snapshots e manifestos necessários à rastreabilidade, planos e logs de cargas parciais.
- Configuração `dados/fonte_oficial.json` para referência, recriada com conta e caminho Python do sucessor.
- Segredos entregues pelo cofre aprovado, não por cópia em documentação, chat ou repositório.
- Evidência de integridade, data e acesso às cópias; contatos de suporte e recuperação no registro restrito.

A pasta `.streamlit/`, `.env*`, bases `.db`, `dados/`, `publicacao_drive/`, backups e vários logs são ignorados pelo Git. Clonar o projeto não entrega esses ativos. Snapshots/backups podem conter informações pessoais; limitar acesso e usar armazenamento protegido aprovado pela empresa.

## 5. Ordem segura da transferência

### Etapa A — preservar e preparar

1. Empresa nomeia titular e substituto e define onde ficarão os serviços e a cobrança.
2. Registrar URLs, proprietários, recuperação/MFA, integrações e consumidores de segredos. Conferir com João sem expor credenciais.
3. Fazer cópias verificadas, fora do computador atual, do código pendente e dos ativos privados. Não limpar estágio ou cargas parciais.
4. Preservar o serviço atual. A troca de responsável não é motivo para executar sincronização extraordinária, excluir dados ou reaplicar todo o SQL.

### Etapa B — dar autonomia ao sucessor

1. Criar acessos individuais autorizados aos serviços; preparar organização corporativa quando aplicável. Habilitar MFA e recuperação institucional com mais de um responsável.
2. Autorizar leitura da view Azure e rede da nova máquina, sem dar privilégios de escrita desnecessários. Reproduzir ambiente pelo [manual](OPERACAO_E_MIGRACAO.md).
3. Sucessor executa leitura e simulação supervisionadas. Simulação escreve estágio/plano, então coordenar para não haver duas rotinas simultâneas.
4. Conferir plano, pendências da carga inicial e links. Aplicar somente com autorização, backup e proteção das análises abertas.
5. Ensaiar publicação/recuperação em ambiente isolado e confirmar como obter suporte.

### Etapa C — transferir custódia dos serviços

TI/admin verifica as opções suportadas e os impactos de cada transferência. Preservar recursos existentes quando viável; não prometer que URL, IDs e integrações serão automaticamente mantidos.

- **GitHub:** transferir o repositório ou estabelecer custódia corporativa aprovada, preservando histórico; conferir permissões e reautorizar integração de build se necessário.
- **Cloudflare:** definir administração corporativa dos recursos e billing. Se exigir novo Worker/conta, testar URL temporária, variáveis e SPA; planejar domínio/DNS e reversão. Não desativar o Worker antigo antes da validação.
- **Supabase:** avaliar transferência de organização/propriedade do projeto com administrador. Mover a custódia do projeto existente é diferente de copiar banco para projeto novo. Se um novo projeto for inevitável, há uma migração própria de dados, Auth/UUIDs, funções/RLS, segredos, redirects, backups e clientes; não fazer por simples importação das seis tabelas do backup avulso.
- **Azure:** trocar a dependência do login de João por acesso individual do sucessor; a fonte corporativa não precisa mudar de banco só por causa da passagem de bastão.

Alterar um serviço por vez, com janela acordada, registro do estado anterior e critérios de retorno. Conferir login, recuperação de senha, reservas, salvamento, contadores, atualização e acesso ao Backoffice após mudanças relevantes.

### Etapa D — encerrar dependência pessoal

Depois do aceite: atualizar contatos de recuperação/cobrança, rotacionar segredos conforme política e consumidores identificados, validar novamente e retirar acessos antigos quando a empresa autorizar. Não rotacionar chave administrativa sem atualizar o sincronizador; não retirar o acesso Azure de João enquanto ainda for a única forma operacional aprovada.

## 6. Se João precisar sair antes de terminar

Priorizar, nesta ordem:

1. Entregar inventário e conceder acesso autorizado a um responsável corporativo enquanto ainda é possível.
2. Preservar código local não publicado, backups e configurações no armazenamento corporativo restrito. Não apagar a máquina/contas antes disso.
3. Registrar última carga aplicada, seu estado e backup, última versão publicada e pendências conhecidas. Se não houver conferência remota, declarar “não confirmado”, não “concluído”.
4. Manter a aplicação existente disponível se houver custódia e cobrança asseguradas. Pausar novas sincronizações se ninguém conseguir validar a fonte/plano; a fila existente não deve ser apagada para resolver a ausência do operador.
5. Acionar TI e administradores dos provedores para transferência formal. Se perderem acesso, seguir recuperação oficial com comprovação de propriedade; não depender de senha pessoal compartilhada.

Ter a documentação não elimina o risco se ninguém receber acesso e os backups. Definir um substituto antes da saída é o item mais urgente.

## 7. Como o sucessor continua a migração Azure

A troca de fonte foi iniciada e autorizada; não é um projeto inteiramente do zero. A prioridade é estabilizar e entregar o processo existente:

1. Reunir e versionar os componentes locais pendentes, mantendo histórico e alterações alheias.
2. Confirmar no Supabase o estado da carga `665293d2-fada-48e0-b2d2-51ad1d9cd73d` e do reparo de links. Há registros históricos de aplicação parcial, não prova de pendência atual.
3. Usar importador corrigido `azure-v3-links-proprios` / contrato `proprios-v1`; nunca aplicar preparação antiga para simplesmente encerrar uma carga.
4. Confirmar com o dono da fonte que a view está completa; extrair, simular e revisar mudanças e arquivamentos. Não voltar ao SQLite corporativo por falta de configuração.
5. Aplicar com backup e reservas protegidas, verificar finalização, links dos dois lados e preservação de avaliações em amostra.
6. Formalizar rotina/contatos e só depois automatizar. [Procedimento executável](OPERACAO_E_MIGRACAO.md).

Para rodar sem pessoa, ainda faltam identidade não interativa e rede aprovadas, armazenamento durável dos backups, controle de concorrência e alertas. GitHub Actions é uma opção futura, não está instalado. Alternativas em infraestrutura corporativa também exigem acesso e operação aprovados. Não liberar firewall para qualquer origem como atalho.

## 8. Critérios de aceite da entrega

- [ ] Empresa definiu titular e substituto; ambos sabem abrir chamado e recuperar os acessos autorizados.
- [ ] URLs, IDs, plano/billing, domínio/DNS e contatos estão inventariados; não dependem exclusivamente da conta pessoal de João.
- [ ] Código entregue reproduz o ambiente local necessário; commit e pendências estão registrados.
- [ ] Sucessor instalou ambiente e leu a view com sua identidade e rede autorizadas.
- [ ] Fonte oficial explicitamente Azure; sucessor executou e explicou uma simulação sem alterar dados operacionais.
- [ ] Última carga e reparos foram conferidos; aplicação/retomada autorizada foi verificada, quando necessária.
- [ ] Login, recuperação de senha, permissões, reserva, salvar, fechar/reabrir e links foram testados.
- [ ] Backup cobre os ativos necessários, está fora da máquina e restauração isolada foi validada; limites documentados.
- [ ] Publicação e retorno a versão conhecida foram ensaiados sem sobrescrever o banco.
- [ ] Credenciais estão no cofre; recuperação/MFA e cobrança institucional foram confirmadas; acessos antigos foram tratados após aceite.
- [ ] Responsável pela operação aprovou a transferência por escrito, com data e pendências aceitas.

Até esse aceite, registrar a passagem como **em andamento**, não como projeto totalmente transferido.
