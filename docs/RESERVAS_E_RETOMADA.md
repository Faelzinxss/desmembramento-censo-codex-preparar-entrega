# Reservas e retomada da página

Esta mudança é somente no frontend: não apaga reservas em lote, não altera
as RPCs de produção e não encurta o prazo de análise.

## Comportamento

- Cancelar confirma a resposta da RPC antes de fechar. Falha de rede mantém
  formulário aberto e mostra aviso para repetir a ação.
- Abertura, fechamento e avanço automático são operações exclusivas na página.
- O formulário é recriado por token de reserva, sem carregar o estado do caso
  anterior para o próximo.
- Em navegadores com Web Locks e sessionStorage disponíveis, a identificação
  da aba sobrevive ao F5. A aba precisa obter um lock exclusivo sem `steal`.
  Aba duplicada recebe identidade nova, pois não pode pegar o lock da original.
- O caso aberto fica no sessionStorage do usuário. Ao recarregar, a RPC existente
  revalida acesso, reserva e revisão antes de reabrir. Não recupera casos de outra
  aba/dispositivo. Retomada agora renova a reserva imediatamente antes de abrir
  o formulário, sem depender do primeiro intervalo de 45 segundos.
- Antes de abrir/registrar A/B e antes de salvar, confirma e renova a reserva
  com o contrato existente. Falha não recria nem toma reservas de outra aba.
- Renovação periódica, retorno à aba e salvamento compartilham requisição em
  voo. Resposta do token anterior é descartada quando o caso muda.
- Expiração mantém formulário aberto, em vez de apagar o preenchimento. O
  rascunho fica no sessionStorage por usuário/caso/modo/versão da revisão.
  Cancelar mantém esse rascunho para uma nova conferência do mesmo caso;
  salvamento confirmado remove. Nunca envia automaticamente o rascunho.
  Se houve envio com resposta perdida, conferir a avaliação antes de repetir.
  Se sessionStorage estiver bloqueado, preservação só em memória, não após F5.
- Não enviar liberação em pagehide quando a página permite retomada: a chamada
  antiga poderia chegar depois do F5 e apagar a reserva retomada. Cancelar libera
  imediatamente; fechar/abandonar a aba sem cancelar deixa a reserva vencer pelo
  prazo normal de cinco minutos. Sem suporte à retomada, mantém pagehide legado.
- Reservas abertas por versões antigas não ganham identidade persistente
  retroativamente. Cancelar/salvar normalmente ou aguardar expiração.

## Retomar depois de Ctrl+W (15/10/2026)

- Enquanto há análise aberta, mantém um único ponto de retomada por usuário
  no localStorage do mesmo navegador/origem. Contém identidade local da aba,
  caso, token de reserva (não token de login), rascunho e filtros/página.
  São dados locais de trabalho, com informações pessoais do caso; não exportar.
- Ao fechar e reabrir em uma aba nova, tenta adquirir o lock exclusivo da aba
  antiga, sem `steal` e sem liberar reservas. Se ela ainda estiver aberta ou
  suspensa, não recupera e não consulta o banco nesse caminho.
- Com lock obtido, confirma a reserva antiga pelo servidor antes de usar a
  cópia do caso. Reserva vencida não é recriada automaticamente com dados
  antigos: precisa abrir pela fila para carregar os dados atuais. O rascunho
  pode ser reaproveitado manualmente somente no mesmo caso/modo/versão.
- Se confirmar, assume a identidade local antiga, valida novamente pelo fluxo
  existente e restaura análise, rascunho, filtros e página. Duas páginas abertas
  simultaneamente não podem assumir a mesma identidade.
- Sem novo polling: nenhuma consulta extra quando não existe retomada ou a
  aba antiga ainda está aberta. Uma retomada confirmada faz até três RPCs
  pontuais (renovar antiga, reservar/retomar, renovar antes de abrir), além
  das consultas usuais da fila. Não altera o intervalo periódico existente.
- Rascunho compartilhado é gravado localmente com debounce de 300 ms e flush
  local em pagehide. A renovação que já existe também atualiza o ponto local.
  Não enviar rascunhos ao servidor nem criar tabela/índice/RPC nova.
- Metadados expiram após 15 minutos sem atualização e são removidos na próxima
  leitura. Salvar/cancelar elimina o ponto; logout remove o ponto desse usuário.
  Não recuperar em outro perfil/navegador/dispositivo, em aba privada diferente,
  ou sem suporte a locks/storage. Nesses casos mantém os bloqueios existentes.
- Apenas análises abertas após carregar esta versão geram esse novo ponto;
  não recupera retroativamente uma aba antiga que já foi fechada.

## Confirmação ao fechar a página

Enquanto houver análise aberta e usuário logado, registra `beforeunload` para
Ctrl+W, X, recarregamento/F5 e navegação para fora do aplicativo. Usa o diálogo
nativo do navegador, sem texto customizado. Não bloqueia o fechamento das abas
A/B do Backoffice. Na fila sem análise, ou após salvar/cancelar, não pede aviso.
Se o próximo automático abrir novo caso, a proteção vale para essa nova análise.
Cancelar o diálogo mantém a página e a reserva; confirmar permite fechar, com
o rascunho/retomada local já descritos acima. Não faz chamadas ao banco no evento.
O navegador pode omitir o diálogo sem interação prévia, em encerramento forçado
ou em certos ambientes móveis. Não é uma garantia de interceptar todo fechamento.
Referência: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event

## Validação

`node --test tests/reserva_pagina.test.mjs` e `npm run build`.

Homologar antes da publicação:

1. Abrir caso e dar F5: mesmo caso reabre, sem mensagem de outra aba.
2. Duplicar aba com caso aberto: duplicada não retoma nem rouba reserva.
3. Em Offline, cancelar: formulário permanece aberto com erro. Voltar Online e
   tentar cancelar: fecha após confirmação; próximo caso abre normalmente.
4. Clicar repetidamente em Avaliar: somente uma abertura.
5. Salvar com próximo automático: formulário do novo caso não herda decisão/
   observação do anterior; testar salvamento repetido e rede instável.
6. Fechar aba sem cancelar: outro dispositivo continua bloqueado até expiração.
7. Retomar reserva com menos de 45 segundos restantes: confirmar renovação
   imediata, antes de abrir A/B; não deve vencer no primeiro intervalo.
8. Após mais de cinco minutos offline/suspensão, tentar salvar: sem novo envio
   com reserva inválida, formulário/rascunho preservados, sem fechar sozinho.
9. Testar resposta atrasada de renovação do caso A após avançar para B: não
   fecha B nem troca seu aviso/rascunho. Testes automatizados usam respostas
   controladas; estes passos de navegador ainda precisam de homologação.
10. Preencher caso em uma página avançada, fechar pelo Ctrl+W e abrir o mesmo
    endereço numa aba nova: mesma análise, rascunho e posição devem voltar.
    Repetir fechando a janela do app e reabrindo no mesmo perfil do navegador.
11. Com a original ainda aberta, abrir/duplicar o app: não deve assumir o caso.
    Fechar original e abrir duas novas simultaneamente: só uma pode retomar.
12. Fechar offline ou reabrir após a expiração da reserva: não forçar retomada
    nem salvar automaticamente; fila deve continuar disponível para conferir.
13. Com análise aberta, Ctrl+W: escolher permanecer mantém tudo; repetir e
    confirmar permite fechar. Reabrir o app deve retomar a análise. Testar F5
    e X, e verificar que na fila sem análise não aparece confirmação.

Não solicitar F5 a todos durante uma análise. Publicar assets não invalida
tokens existentes; a mudança entra quando a pessoa carregar a nova versão.
