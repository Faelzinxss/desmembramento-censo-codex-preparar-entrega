# Meus trabalhos e reconferência

## Comportamento

- **Minha produtividade** continua usando o resumo diário leve existente.
- **Meus trabalhos** lista somente as avaliações do usuário autenticado, com filtro por decisão, dia, busca por Código Deep e páginas de 50 casos.
- A busca confere a matrícula A, a matrícula B e o novo Código Deep do desmembramento. **Limpar filtros** restaura toda a lista.
- O autor pode abrir os dados e as fotos, consultar A e B no Backoffice e corrigir sua própria avaliação.
- Uma correção grava a versão anterior no histórico pelo gatilho já existente. O banco rejeita o salvamento se outra alteração tiver ocorrido desde a abertura da tela ou se o caso estiver reservado por outra pessoa.
- A tela não possui fila de reconferência, pendências ou obrigação especial para desmembramentos. Ela serve para consultar e corrigir o próprio trabalho.
- O Backoffice A e B é aberto em conjunto, seguindo o mesmo padrão da fila principal.

## Desempenho

A lista parte do índice `(usuario_id, decisao, revisado_em)` e carrega os detalhes das matrículas apenas para os 50 itens da página. Ela não consulta a fila, não cria reserva durante a leitura e não adiciona polling. Marcar a reconferência altera uma única linha.

## Publicação

1. Executar `sql/RECONFERENCIA_DESMEMBRAMENTOS.sql` no Supabase e confirmar os quatro resultados `true`.
2. Publicar o frontend somente depois da aplicação do SQL.
3. Testar com um conferente: filtros, abertura de A/B, correção, check de desmembramento e retorno aos pendentes após nova correção.
