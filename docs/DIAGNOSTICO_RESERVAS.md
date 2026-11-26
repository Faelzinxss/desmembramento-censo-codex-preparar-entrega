# Identificação automática de falhas de reserva

Instalar `sql/DIAGNOSTICAR_RESERVA_INVALIDA_SALVAMENTO.sql` no SQL Editor.
O resultado esperado é `diagnostico_reserva_ok = true`.
A instalação modifica somente o bloco que já lança a exceção de reserva no
salvamento. Lê a definição instalada e aborta se o contrato/trecho divergir.
Não sobrescreve as customizações de histórico ou as regras de revisão, não
altera permissões, não apaga reservas, não executa avaliações e não cria tabelas.
Chamadas em andamento podem terminar com a definição anterior.

## Como usar

Em novas falhas de `salvar_revisao_web_v2`, abrir Raw JSON do erro Postgres e
consultar `parsed.detail` (ou `detail` dentro dos atributos). A resposta HTTP
também recebe esse detalhe; pode ser vista no navegador da pessoa afetada.
O campo contém JSON identificado por `diagnostico = reserva_salvamento_v1`:

- `usuario_id` e `usuario_nome`: identidade autenticada e perfil da chamada.
- `caso_id`, `operacao_id`, `horario`: correlação da tentativa rejeitada.
- `motivo`: parâmetro ausente, reserva ausente para o usuário, caso divergente,
  aba divergente, reserva expirada, ou divergência durante a validação.
- Flags de correspondência e prazo, com `expira_em` da reserva do próprio usuário.
- `versao_app_informada`: cabeçalho da aplicação nova, ou `nao_informada`.
  É informação declarada pelo cliente, não prova criptográfica nem autorização.
  A ausência pode ser versão antiga, outro cliente ou cabeçalho removido.

`reserva_ausente_para_usuario` NÃO comprova expiração: pode ter sido liberada,
substituída, pertencer a outro usuário ou o token não existir. Só classificamos
como expirada quando encontramos a própria reserva e seu prazo venceu.
A consulta adicional ocorre apenas no caminho de erro e usa o token indexado.
Não registra token completo, identificador bruto da aba, senha/JWT, decisão,
observação ou dados de reservas de terceiros. Acesso aos logs contém dados
pessoais do usuário e deve ficar restrito aos administradores.

## Limitações e segurança

Não identifica retroativamente as ocorrências antigas; API Gateway ainda pode
ajudar a correlacioná-las. Não registra falhas bloqueadas pelo frontend antes
da chamada de salvar. Esse diagnóstico não corrige a causa por si só.
Não usa inserção em tabela de erros: uma inserção dentro da transação abortada
pela exceção seria desfeita. Usa DETAIL da exceção, sujeito à retenção dos logs.
Não provoque erros com avaliações reais para testar. Homologar em ambiente
isolado; os testes locais verificam transformações/privacidade/compilação,
mas a instalação ainda precisa ser validada no PostgreSQL pelo SQL Editor.

Publicar `src/supabase.js` acrescenta o cabeçalho `x-auditoria-versao` às
chamadas do cliente. O diagnóstico de usuário/motivo funciona antes dessa
publicação, inclusive em clientes antigos. Não exigir F5 durante uma análise.

Para remover só o diagnóstico, executar
`sql/REVERTER_DIAGNOSTICO_RESERVA_INVALIDA.sql`; preserva o restante da função.
