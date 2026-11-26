# Documentação do projeto — Auditoria visual de imóveis

Revisão: **15/10/2026**. Referência do código local, não comprovação independente do estado ao vivo de Cloudflare, Azure ou Supabase. O [estado atual](STATUS_ATUAL.md) separa evidências e pendências. Procedimentos antigos foram preservados em `historico/`.

## 1. Finalidade e limites

O sistema transforma indícios da base do Censo Rural em casos para avaliação humana. Permite comparar duas matrículas, abrir fotos e Backoffice, filtrar a fila, registrar decisões, organizar equipes/prioridades e consultar produção e histórico.

Para analistas e suporte inicial: [guia de uso e atendimento](MANUAL_USUARIO.md).

O aplicativo não é a fonte original das visitas nem altera a view corporativa. A fonte fornece dados e indícios; o Supabase mantém a operação e as avaliações. Transferir as contas do projeto, trocar a fonte de dados e automatizar a rotina são trabalhos diferentes.

## 2. Arquitetura e responsabilidades

| Componente | Responsabilidade | Onde está |
|---|---|---|
| Azure SQL | Cadastro e indícios de origem, leitura da view | `bdcenso.database.windows.net`, banco `VISITAS_CENSO`, `dbo.vw_desmembramentos` |
| Leitor Python/ODBC | Login, extração completa e validação | `scripts/extrair_fonte_sql_server.py` |
| Preparação local | Normalização, pares, hashes e arquivos intermediários | `scripts/preparar_base_web.py`, `dados/`, `publicacao_drive/` |
| Sincronização | Estágio, planejamento, backup, aplicação e verificação | `scripts/atualizar_base_oficial.py`, `scripts/atualizar_base_azure.py`, `scripts/atualizar_base_diaria.py` |
| Supabase | Auth, RLS, fila, reservas, avaliações, histórico e contadores | Projeto `iybqjvldjbknvglqqkdx` |
| Frontend | Interface React/Vite; acessa Supabase, não Azure diretamente | `src/`, `package.json` |
| GitHub | Código e histórico versionado | `joaochvs/desmembramento-censo`, branch `main` |
| Cloudflare | Hospedagem dos arquivos de `dist/` e roteamento SPA | Worker configurado como `desmembramento-censo` em `wrangler.jsonc` |

A extração Azure gera SQLite local por conveniência de processamento. Isso não significa que a rotina voltou a ler o SQLite corporativo antigo. Não existe leitura diferencial por `AtualizadoEm` garantida no contrato atual: o leitor percorre a fonte, compara conteúdo e o envio operacional é incremental.

## 3. Regras dos dados

- Identificadores são texto, preservando sufixos e hífens. O par é normalizado para que A+B e B+A representem o mesmo caso.
- `caso_id` é SHA-256 de `CODE_A|CODE_B`, truncado para 24 caracteres. A+C é outro caso, mesmo que A+B já tenha sido analisado.
- Pares repetidos são consolidados; a maior similaridade do par é preservada.
- Duplicata e revisão visual exigem similaridade ≥80%. Alerta de proximidade entra como revisão visual, também sujeito ao corte. Desmembramento e inconsistência de Backoffice têm tratamento próprio, sem esse corte.
- OK, avisos, incompletos, erros e estados desconhecidos não geram automaticamente caso de análise.
- Linha sem suspeito pode completar o cadastro de uma matrícula, mas não gera um par. Autorrelação não gera caso.
- `Link Backoffice` pertence a `ID_Completo`; `URL_Backoffice` pertence a `Codigo_Suspeito`. Nunca substituir o link próprio pelo do outro lado. Se faltar link próprio, deixar ausente.
- Os campos atuais de fotos são tratados pelo importador; ampliar para todas as fotos/tabela filha é evolução, não funcionalidade assumida como implantada.

Detalhes e 17 colunas: [contrato da fonte](CONTRATO_FONTE_SQL_SERVER.md).

### Política Azure de ausentes

O Azure é a referência aprovada para o trabalho pendente. A rotina insere novos pares, atualiza conhecidos e pode reativar pares reaparecidos. Pendentes ausentes podem ser arquivados (`ativo=false`), sem exclusão física. Ausentes com avaliação ficam preservados; reservas e avaliações são revalidadas na aplicação para proteger trabalho em andamento. O corte de similaridade é uma regra separada.

Revisões e histórico não devem ser sobrescritos pela carga da origem. O modo legado SQLite preserva ausentes e não é um substituto automático equivalente ao Azure. Não alternar fontes durante uma carga ou retomada.

## 4. Segurança, usuários e permissões

Supabase Auth identifica o usuário; perfis e funções SQL/RLS controlam o acesso. Os perfis usados são conferente, gestor e administrador. A interface não é a barreira de segurança: autorizações precisam existir no servidor.

Primeira avaliação, reavaliação de supervisão e reconferência do próprio trabalho têm caminhos e condições diferentes. Não conceder a todos o acesso do conferente nem alterar funções-base para contornar uma falha. Confira a definição instalada e as exceções do fluxo antes de mudar uma permissão.

O frontend usa URL e chave pública; Python administrativo usa chave privada de serviço. Chave de serviço não deve aparecer em `.env.local` como variável `VITE_`, código, logs, prints, chat ou Git. Permissões de `anon` e `authenticated` são diferentes por intenção; não liberar acesso anônimo como correção genérica.

Senha de usuário não é recuperável em texto. Existe recuperação no fluxo de login; validar entrega de e-mail, SMTP e URLs de redirecionamento no projeto. Não exportar/sincronizar senhas entre contas.

## 5. Reservas, concorrência e continuidade da análise

O servidor valida usuário, caso, token, identidade da aba e prazo. A reserva usa prazo de cinco minutos, renovado pelo cliente aproximadamente a cada 45 segundos enquanto o fluxo permite. Falha de rede, suspensão da máquina/aba e atrasos podem impedir renovação; a mensagem de reserva inválida por si só não identifica a causa.

A versão recente recupera a análise após fechamento acidental quando ainda há reserva válida e identidade local recuperável. Usa trava entre abas do mesmo navegador para não tomar uma análise realmente aberta. A referência local tem expiração própria; ela não prolonga os cinco minutos do servidor. Não recupera automaticamente trabalho de outro computador/perfil e não dispensa validação de autorização.

Há rascunho local e aviso nativo de saída com análise aberta. O navegador controla texto e disponibilidade desse aviso; encerramento forçado e alguns ambientes podem não exibi-lo. Não é garantia de salvamento. Após atualização, testar fechar/reabrir, F5 e duas abas conforme [roteiro específico](RESERVAS_E_RETOMADA.md).

O diagnóstico de salvamento inclui usuário, caso, motivo e versão informada pelo cliente, sem registrar token de reserva nem conteúdo da análise. O marcador de versão é informativo, não prova de autenticação. Ver [diagnóstico de reservas](DIAGNOSTICO_RESERVAS.md).

## 6. Modelo operacional e banco

Principais famílias, não inventário exaustivo do banco instalado:

| Família | Exemplos | Cuidado |
|---|---|---|
| Cadastro e fila | `matriculas`, `casos` | Atualizados pela fonte sem apagar trabalho humano |
| Decisões e identidade | `revisoes`, `revisoes_historico`, `reconferencias_desmembramento`, `perfis`, Auth | Preservar IDs e vínculos; acesso restrito |
| Trabalho e organização | Reservas, `distribuicoes`, `prioridades_municipios`, equipes e notificações | Não limpar reservas para forçar sincronização |
| Sincronização | Cargas, `estagio_matriculas_web`, `estagio_casos_web`, `plano_sincronizacao_web` | Simulação também escreve aqui |
| Agregações | `volume_pendencias_geral`, filtros e contadores | Validar depois da aplicação |

Os arquivos `sql/` incluem criação, diagnóstico e correções de épocas diferentes. **Não constituem uma sequência de migrações completa e testada para instalar um banco vazio.** Produção tem funções alteradas ao longo da operação. Antes de reconstruir ou transferir banco, exportar esquema instalado, funções, grants, políticas, extensões e configurações por processo autorizado. Não reaplicar um script-base de concorrência sobre funções corrigidas.

## 7. Operação diária

Roteiro completo: [operação e migração](OPERACAO_E_MIGRACAO.md).

1. Confirmar que a atualização upstream da view terminou; ausência de erro de schema não prova fonte completa.
2. Extrair e validar snapshot, preparar dados locais e enviar manifesto de estágio.
3. Planejar diferenças. Conferir fonte, volume, arquivamentos e proteção do histórico.
4. Gerar backup específico do plano antes de aplicar.
5. Aplicar em lotes, sem forçar registros reservados.
6. Só considerar concluído após finalização e verificação dos contadores/temporários.

A rotina tem sete etapas exibidas, contando a validação e a preparação separadamente. Saída parcial aguardando reservas exige acompanhamento; não significa perda das avaliações nem conclusão total. A verificação automática confere status, contagem de casos ativos/contador e limpeza dos temporários da carga, mas não substitui conferência funcional e amostras do histórico.

O atalho diário usa `--confirmar`: pode aplicar sem perguntar novamente. `--somente-simular` é o caminho explícito para parar no plano. Reconciliação excepcional pelo leitor legado está bloqueada no fluxo atual.

## 8. Desenvolvimento, testes e publicação

Instalar dependências frontend com `npm ci`; executar `npm run dev` e compilar com `npm run build`. React, Vite e versões efetivas estão em `package.json`/lockfile. Use runtime compatível com essas dependências. Python operacional usa `requirements-local.txt`, incluindo `requests` e `pyodbc`; o driver ODBC é instalação separada.

Testes locais:

```powershell
python -m unittest discover -s tests
node --test tests/reserva_pagina.test.mjs
npm run build
```

O comando Node aponta para a suíte existente nesta revisão. Os testes não comprovam implantação ao vivo. Não usar testes como pretexto para aplicar mudanças em produção.

Publicação atual é integração GitHub/Cloudflare da branch `main`; conferir configuração no painel. Antes de subir, inspecionar `git status`/diff, selecionar apenas arquivos da tarefa e testar. Não incluir dados nem segredos. Push não comprova deploy: verificar commit e resultado do build/deployment e abrir a aplicação publicada. Falha no fetch do repositório é anterior à compilação e não prova erro React.

Alterações de funções SQL não são instaladas automaticamente por um deploy do frontend. Registrar script, data, responsável, validação e reversão. Atualização da aplicação deve respeitar quem está analisando: concluir/cancelar a análise antes de recarregar.

## 9. Backup, recuperação e suporte

O backup avulso cobre algumas tabelas operacionais e metadados Auth; o incremental cobre registros afetados pelo plano. Nenhum dos dois, isoladamente, é backup integral de todo o projeto. Histórico de ausentes não é necessariamente reconstruível a partir da view atual. Ver [limites e restauração](../manutencao/RESTAURAR_BACKUP.md).

Logs, snapshots e backups contêm dados pessoais. Usar armazenamento corporativo restrito, com cópia fora do computador e retenção aprovada. Nunca depender apenas do OneDrive pessoal/da sessão do responsável. Definir responsáveis, frequência de backup, perda tolerável de dados e prazo de recuperação; hoje esses compromissos institucionais precisam ser formalizados.

Para incidentes, coletar horário/fuso, ação, versão, erro e identificador do caso; ocultar tokens e dados pessoais desnecessários. Preservar rascunho. Investigar reservas por diagnóstico, não desativando a proteção. Timeouts de planejamento não autorizam aplicar plano antigo. [Guia de timeout](RETOMAR_ATUALIZACAO_TIMEOUT.md).

## 10. Continuidade e documentação histórica

Toda a custódia de GitHub, Cloudflare e Supabase está nas contas do responsável atual. O risco não é só código: envolve recuperação de conta/MFA, cobrança, segredos, arquivos locais ignorados e dependência do login Azure. Siga [transferência e continuidade](TRANSFERENCIA_E_CONTINUIDADE.md) antes de encerrar qualquer acesso.

Docs antigos de carga inicial, reconciliação e otimização são referências de época. Em divergência operacional, usar este manual, o estado atual e o código validado; investigar a definição instalada no servidor antes de executar SQL. Não tratar totais históricos como números atuais.
