# Validação pendente da consulta de prévia

`LOTES_02_SNAPSHOT.sql` está preparado e não aplicado no Supabase.

Atualização 07/09: `LOTES_03_CONFIRMAR.sql` também está preparado e não aplicado.
A confirmação transacional passou em PGlite: autorização, conteúdo pertencente ao
snapshot, idempotência, gravação de lote/vínculos/evento e rollback integral após
reserva surgida depois da prévia. A tabela de operações não aceita leitura direta
do navegador. O total atual é 21 testes Node e 12 verificações SQL locais.
O teste de interface confirmou 3 casos em 2 lotes usando somente fixture sintética.
PostgREST, concorrência em conexões reais e desempenho de confirmação com um
município representativo continuam obrigatórios antes da ativação da fila.

## Validação local executada em 04/09/2026

### Resultado atual — formato compacto v2

LOTES_02 ainda não foi aplicada remotamente; o mesmo arquivo preparado passou a
produzir tuplas de dez campos em páginas de 5.000 casos. Nenhum caso ativo ou
vínculo foi excluído para reduzir tráfego. O cliente valida e expande as tuplas;
aceita v1 para compatibilidade, rejeita versões misturadas entre páginas.

Passaram 18 testes Node e 10 verificações SQL no PGlite 0.5.8. Inclui comparação
exata dos casos/divisão entre formatos e cliente real conectado às RPCs locais.
Para 139.940 casos sintéticos: 28 páginas (antes 280), mais uma chamada de criação;
11.060.562 bytes de respostas das páginas (antes cerca de 28,7 MB de casos).
Redução aproximada de 61% em JSON sem compressão HTTP e 90% nas leituras de páginas.
Criação local 1,082 s, leitura/decodificação 0,400 s, cálculo 0,252 s.
São medições locais sem rede, não uma previsão da latência real.

Próximo passo: integrar a tela e medir limites de resposta/latência via PostgREST
antes do piloto. Concorrência entre conexões, autenticação Supabase real e
confirmação transacional continuam pendentes. Não aplicar de novo LOTES_01.

### Medição anterior — formato v1 (histórico)

Além dos 16 testes Node de motor/cliente, passaram 10 verificações executando os
arquivos SQL originais em PGlite (PostgreSQL embutido, banco efêmero em memória),
com schema mínimo compatível com o CSV real, papéis e auth.uid() sintéticos.
Script reproduzível: `tests/validar-snapshot-sql.mjs`.

- Migrações LOTES_01 e LOTES_02; base vazia; paginação; rejeição de páginas inválidas.
- Negação de criação para anon, analista, gestor e admin inativo; negação de acesso
  direto ao cache e de leitura do snapshot de outro admin.
- Cópia imutável após mudanças na base; substituição; expiração; perfil desativado.
- Reserva vigente/vencida; vínculos de caso e de matrícula com caso original inativo.
- Criação por outro admin preserva a primeira cópia; rollback preserva cópia anterior.
- 139.940 casos sintéticos, em grupos de cinco, sem perda/duplicação, 20 analistas.
  Última execução: criação 1,761 s; leitura das 280 páginas 0,638 s; cálculo 0,227 s.
  Cargas de 6.995 a 7.000 casos. JSON dos casos: 28.689.821 bytes (cerca de 28,7 MB).

Esses tempos NÃO estimam o Supabase real: não incluem rede, PostgREST, autenticação
real, concorrência entre conexões ou os grupos reais. O volume de transferência e
as 280 chamadas sequenciais são um custo a resolver/medir antes da integração da
tela. Os testes não autorizam ativar distribuição/confirmar lotes.

Para reproduzir, instalar `@electric-sql/pglite` em diretório externo ao projeto,
definir `PGLITE_MODULE` com o caminho absoluto do `dist/index.js` e executar
`node tests/validar-snapshot-sql.mjs`. Nenhuma credencial ou conexão remota é usada.

## Antes de aplicar

1. Usar um banco separado com a estrutura real e dados sintéticos representativos.
   Conferir colunas de perfis, casos, revisoes, reservas, lote_casos e lote_matriculas.
   Não reconstruir o banco pelo arquivo histórico MIGRACAO_WEB_SUPABASE.sql,
   encontrado com conteúdo `fe` nesta cópia.
2. Aplicar LOTES_02 inteiro nesse ambiente. LOTES_01 já existe em produção e não
   deve ser repetido lá. A nova migração cria somente cache e duas RPCs novas.
3. Testar com sessões autenticadas reais: admin ativo cria/lê sua própria prévia;
   analista, gestor, desativado e anônimo não conseguem criar/ler. Outro admin não
   consegue ler o snapshot alheio. Desativar o criador entre páginas deve negar acesso.
4. Confirmar que SELECT/INSERT/UPDATE/DELETE diretos das duas tabelas estão negados
   aos papéis anon/authenticated. As funções não podem ser executadas por anon.

## Consistência e concorrência

- Com 10.001 casos ativos no formato v2, exigir três páginas (5.000/5.000/1), sem repetição ou omissão.
  Base vazia deve retornar total=0 e paginas=0. Página negativa, nula ou além do fim falha.
- Depois de criar o snapshot, alterar casos, revisões e reservas em outra sessão.
  As páginas antigas devem permanecer idênticas; nova criação deve refletir alterações.
- Verificar flags: revisão existente; reserva vencida/vigente; vínculo em lote_casos;
  vínculo em lote_matriculas mesmo quando o caso original está inativo. Qualquer
  vínculo corrente bloqueia conservadoramente, inclusive lote encerrado.
- Criar duas prévias simultâneas com o mesmo admin: a última substitui a primeira,
  sem misturar páginas. Entre admins, cada um mantém sua própria cópia.
- Expirar o snapshot no ambiente de teste: leitura deve falhar e a próxima criação
  deve limpar somente o cache expirado. Repetir cancelamento/falha durante criação:
  não pode deixar metadados de uma cópia parcialmente gravada.
- Medir criação, leitura, armazenamento temporário e plano com volume representativo.
  Cada admin mantém uma cópia enxuta de todos os casos ativos. Expirados ficam
  armazenados até a próxima criação; não há agendamento de limpeza nesta entrega.

## Após aprovação dos testes

Fazer backup antes da aplicação pelo usuário. Integrar a tela ao serviço
`src/lotes/prepararPrevia.js` e testar o Worker no navegador, cancelamento e expiração.
O build da aplicação atual não exercita esse serviço ainda não importado pela tela.
Revalidar os analistas selecionados e todas as condições na futura confirmação SQL:
o snapshot não reserva casos e não concede autorização de gravação.
Não liberar confirmação, alterar fila ou remover distribuições nesta etapa.

Para descartar a entrega antes da integração, remover apenas as duas RPCs novas
e as duas tabelas de cache em uma migração revisada. Nenhum dado operacional é
armazenado exclusivamente no cache.
