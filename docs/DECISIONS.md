# Registro de decisões técnicas

Decisões extraídas do código e da documentação vigente até **17/10/2026**.

## Matrícula vermelha mantém lote pendente de verificação

**Decisão de 22/10/2026:** após preencher todas as matrículas, uma matrícula que permanece vermelha no envio exige verificação humana e mantém o lote pendente. Conferir a mensagem exibida e possível ausência de CPF; não inferir a causa somente pela cor.

**Status:** regra operacional confirmada pelo usuário e documentada em `DATA_RULES.md`; detecção automática ainda não implementada.

## Fonte Azure com snapshot local validado

**Descrição:** Azure SQL é lido em modo somente leitura e convertido em snapshot SQLite antes da preparação.

**Motivo:** separar aquisição da fonte, permitir hash estável, validação e retomada do mesmo conteúdo.

**Impacto:** exige ODBC 18, autenticação/rede e espaço local; o snapshot contém dados sensíveis.

**Status:** Ativa. Em 24/10/2026, a extração e a atualização completa foram concluídas e verificadas.

## Azure CLI no tenant da fonte

**Descrição:** no Windows, a rotina seleciona explicitamente o tenant do Azure SQL e entrega ao ODBC um token temporário obtido pelo Azure CLI.

**Motivo:** o login ODBC interativo falhava no WAM com `0x534`; um token emitido pelo tenant corporativo diferente do tenant do servidor era recusado com `18456`.

**Impacto:** cada computador precisa do Azure CLI e do primeiro login web. O token fica somente no cache protegido do CLI e em memória; nenhuma credencial entra no repositório.

**Status:** Ativa e validada em 24/10/2026. `DESMEMBRAMENTO_AZURE_TENANT_ID` permite configuração local se a infraestrutura mudar.

## Sincronização planejada antes da aplicação

O planejador em etapas preserva as regras da função anterior. A geração deixa a carga em `recebendo` e bloqueia mudanças no estágio até a confirmação dos totais. A finalização promove a carga para `planejada` e a torna elegível ao fluxo de backup e aplicação. A versão 2 separa o arquivamento de ausentes do Azure em uma chamada própria. Cada chamada tem o mesmo limite individual do planejador anterior.

**Descrição:** a rotina prepara, envia estágio, calcula plano, faz backup e só depois aplica lotes.

**Motivo:** tornar diferenças auditáveis, bloquear fonte alterada e permitir retomada controlada.

**Impacto:** a “simulação” ainda escreve tabelas técnicas no Supabase; planos antigos não podem ser reaplicados após mudança de contrato.

**Status:** Ativa.

## Identidade determinística do par

**Descrição:** códigos são ordenados e o par recebe `caso_id` derivado de SHA-256.

**Motivo:** deduplicar A–B/B–A e preservar a mesma revisão entre cargas.

**Impacto:** qualquer mudança no algoritmo cria novas identidades e ameaça histórico.

**Status:** Ativa.

## Corte de similaridade em dois tipos

**Descrição:** duplicidade e revisão visual entram na fila somente a partir de 80%; outros tipos aprovados não usam esse corte.

**Motivo:** regra operacional aprovada para evitar que registros abaixo do limiar impeçam a conclusão.

**Impacto:** afeta fila, totais e ativação/desativação, mas não apaga revisões existentes.

**Status:** Ativa.

## Concorrência autorizada no banco

**Descrição:** reserva/token/aba/versão são confirmados por RPC; storage e Web Locks apenas coordenam a experiência local.

**Motivo:** vários usuários e clientes antigos não podem confiar somente no navegador.

**Impacto:** toda abertura, acesso ao Backoffice, salvamento, renovação e liberação dependem dos contratos v2.

**Status:** Ativa; requer inventário das definições instaladas.

## Histórico somente para alteração real

**Descrição:** uma linha representa a decisão vigente; a versão anterior vai ao histórico somente numa correção efetiva.

**Motivo:** impedir produção/histórico falso por retry, duplo clique ou confirmação sem mudança.

**Impacto:** produtividade precisa conciliar decisão vigente e versões anteriores sem duplicar eventos técnicos.

**Status:** Ativa pelo contrato esperado; confirmação do SQL instalado pendente.

## Link pertence à própria matrícula

**Descrição:** `Link Backoffice` pertence ao `ID_Completo`; `URL_Backoffice` pertence ao suspeito e não serve como fallback cruzado.

**Motivo:** evitar abrir o cadastro errado na comparação A/B.

**Impacto:** snapshots antigos são bloqueados por versão de contrato; houve reparo pontual de dados.

**Status:** Ativa no importador local.

## Ausentes Azure são arquivados com preservação

**Descrição:** pendentes ausentes podem ficar `ativo=false`; revisões permanecem e reservas impedem alteração concorrente.

**Motivo:** a view Azure passou a representar a fonte operacional, sem apagar rastreabilidade.

**Impacto:** difere do modo SQLite acumulativo; exige RPC específica e não permite alternância silenciosa de fonte.

**Status:** Em revisão operacional após carga parcial.

## SQL histórico não é sequência de migração

**Descrição:** `sql/migracoes_aplicadas/` preserva evolução conhecida; arquivos soltos em `sql/` são correções, instalações ou diagnósticos pontuais.

**Motivo:** várias funções foram substituídas ao longo da produção e reaplicar arquivos antigos pode regredir contratos.

**Impacto:** toda mudança precisa comparar a definição instalada e ter verificação própria.

**Status:** Ativa.

## CI separado de produção

**Descrição:** CI futuro deve executar testes/build; atualização noturna precisa de executor, identidade, rede, segredos, trava e alertas próprios.

**Motivo:** um pipeline de validação não deve ganhar automaticamente permissão administrativa sobre produção.

**Impacto:** GitHub Actions ainda não está configurado para atualização de dados.

**Status:** Planejada.
