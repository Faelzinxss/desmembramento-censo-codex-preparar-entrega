# Estado atual e passagem de bastão

Revisão documental: **15/10/2026**. Não foi executada atualização da base, transferência de contas ou auditoria ao vivo dos serviços nesta revisão.

## Confirmado pelo código local e histórico disponível

- Frontend React/Vite, Supabase operacional e Cloudflare configurado para assets SPA.
- A fonte selecionada neste computador é Azure SQL, view `VISITAS_CENSO.dbo.vw_desmembramentos`. Login Microsoft interativo; ODBC 18 e Python foram usados nos testes locais.
- Política aprovada em 13/10: arquivar pendentes ausentes do Azure, preservar revisões e proteger reservas. Usuário retornou `politica_azure_ok=true` e `arquivamento_ok=true` após instalação.
- Links corrigidos no importador: `Link Backoffice` do `ID_Completo`; `URL_Backoffice` do suspeito. Preparações antigas sem `proprios-v1` são bloqueadas.
- Reparo pontual registrado em 13/10: 136.915 links corrigidos e sete adiados por reserva. Isso não afirma que ainda estão pendentes hoje; conferir antes de repetir.
- Último commit de retomada/aviso de saída: `213fe92`. Anteriores: `0b61c8e` (diagnóstico), `96d9ab6` e `f459f1d` (reservas). Push registrado; deployment efetivamente servido precisa ser conferido no Cloudflare.
- Há rascunho local, retomada protegida entre abas e confirmação nativa de saída enquanto há análise aberta. Teste funcional em produção depende de navegador/versão e deve ser acompanhado.
- Não há GitHub Actions ou agendamento autônomo configurado.

## Riscos e pendências de continuidade

| Prioridade | Pendência | Como encerrar |
|---|---|---|
| Alta | GitHub, Cloudflare e Supabase em contas pessoais de João, confirmado em 15/10 | Nomear responsável corporativo e substituto, inventariar acessos/cobrança e transferir com validação, sem compartilhar senha |
| Alta | Implementação Azure e SQLs/correções locais ainda não versionados | Revisar diff, separar alterações, testar e publicar somente código autorizado; transferir dados/segredos fora do Git |
| Alta | Nota local registra carga Azure inicial parcial | Consultar estado atual da carga e verificar o que falta com plano do importador corrigido; não reaplicar preparação antiga |
| Alta | Backup completo/restauração em ambiente isolado não comprovados | Inventariar esquema/configurações/dados, criar cópias seguras e validar recuperação antes da troca de custódia |
| Média | Identidade/rede para execução sem pessoa não aprovadas | TI definir conta técnica ou identidade não interativa e conexão autorizada antes de agendar |
| Média | URLs finais, domínio/DNS, planos, billing e contatos de recuperação não inventariados | Preencher o registro do plano de transferência |

### Carga Azure inicial: referência, não autorização para aplicar

ID: `665293d2-fada-48e0-b2d2-51ad1d9cd73d`. A configuração local traz observação de aplicação parcial em 13/10/2026. O primeiro processamento é anterior à correção final de links. Antes de continuar, consultar o estado remoto com acesso autorizado e preservar backup/logs. O plano antigo não deve ser aplicado com dados preparados em contrato antigo. Ver [operação e migração](OPERACAO_E_MIGRACAO.md).

Não há inventário remoto novo nesta revisão para afirmar que tudo finalizou ou informar totais atuais. O total da tela inclui regras e preservação de histórico e não precisa ser igual ao total de pares da view.

## Próxima sequência recomendada

1. Garantir ao menos dois responsáveis corporativos e cópias restritas dos ativos, com João ainda disponível.
2. Registrar e versionar o código local pendente, após revisão; não publicar o diretório inteiro.
3. Preparar computador do sucessor com sua própria conta Azure, configuração explícita de fonte e segredos aprovados.
4. Somente simular com view completa; conferir plano e pendências da carga inicial/links.
5. Aplicar com backup e supervisão; validar status final e uso funcional.
6. Transferir custódia/recuperação/cobrança, testar e só então revogar acessos antigos. Agendar a rotina em etapa separada.

Roteiro detalhado e critérios de aceite: [transferência e continuidade](TRANSFERENCIA_E_CONTINUIDADE.md).

## Evidência e histórico

Nesta revisão documental foram executadas novamente as suítes locais: **84 testes Python e 27 testes Node aprovados**. O último registro anterior também indicava build aprovado em 15/10; o build não foi repetido para esta alteração apenas documental. Isso não comprova implantação ou integridade dos dados ao vivo. As informações de setembro foram preservadas em [histórico do status](historico/STATUS_ANTES_REVISAO_20261015.md); seus números e instruções não representam a operação atual.
