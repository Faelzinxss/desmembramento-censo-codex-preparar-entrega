# Contrato da fonte SQL Server

Revisado em **15/10/2026**. Fonte adotada localmente: `VISITAS_CENSO.dbo.vw_desmembramentos`. O contrato descreve o importador atual; não comprova a conclusão da atualização upstream. Execução: [operação e migração](OPERACAO_E_MIGRACAO.md).

## Objetivo

Substituir o arquivo SQLite `Banco de dados - Desmembramentos.db` por uma tabela
ou view no SQL Server, preservando a fila operacional existente no Supabase.

O fluxo recomendado e:

`SQL Server (fonte oficial) -> sincronizador -> Supabase -> aplicativo web`

O aplicativo nao deve acessar o SQL Server diretamente. O Supabase continua
responsavel por autenticacao, RLS, fila, reservas, revisoes, historico, Realtime e
relatorios operacionais.

## Colunas consumidas atualmente

| Coluna de origem | Necessidade | Uso no aplicativo/processamento |
|---|---|---|
| `ID_Completo` | Obrigatoria | Matricula da linha; forma os lados A e B e identifica os dados da matricula. |
| `Codigo_Suspeito` | Obrigatoria para gerar caso | Matricula relacionada; linhas vazias nao geram apontamento. |
| `Status_Validacao` | Obrigatoria | Define o tipo amigavel da ocorrencia e preserva o status original. |
| `Percentual_Similaridade` | Obrigatoria para os tipos com corte | Similaridade exibida e filtro de entrada na fila. |
| `Detalhe_Inconsistencia` | Recomendada | Texto usado no resumo do indicio, matricula relacionada e distancia. |
| `URL_Backoffice` | Recomendada | Link do `Codigo_Suspeito`; nunca alternativa do link de `ID_Completo`. |
| `Link Backoffice` | Recomendada | Link próprio do `ID_Completo`. Cada matrícula recebe o link do próprio cadastro. |
| `Nome do Agente` | Recomendada | Agente mostrado nos dados da matricula. |
| `Data do registro` | Recomendada | Data da visita/registro mostrada na comparacao. |
| `1.6 Logradouro_field` | Recomendada | Endereco mostrado na comparacao. |
| `1.8.1 Complemento_field` | Recomendada | Complemento mostrado na comparacao. |
| `Observações_field` | Recomendada | Observacao da base de origem. |
| `1.4 Município_field` | Obrigatoria para operacao por municipio | Filtro, cards e painel de pendencias. |
| `1.9.1 Tire uma foto da visita da propriedade (horizontal)_field` | Recomendada | Foto(s) da propriedade. |
| `2.2.1 Foto da estrutura (horizontal)_field` | Recomendada | Foto(s) da estrutura. |
| `Situação Backoffice - Visita` | Opcional, preferida | Status do Backoffice exibido na matricula. |
| `Situação Backoffice` | Opcional, alternativa | Usada somente se a coluna preferida nao existir. |

Total: 15 colunas fixas e uma das duas alternativas de situacao do Backoffice.

## Regras atuais que precisam ser preservadas

1. Linhas sem `Codigo_Suspeito` nao geram casos, mas linhas com `ID_Completo`
   podem completar os dados de uma matricula citada por outro apontamento.
2. `ID_Completo` igual a `Codigo_Suspeito` nao gera caso.
3. A ordem A/B e normalizada alfabeticamente, independentemente da ordem da
   origem.
4. O `caso_id` e deterministico: SHA-256 de `CODE_A|CODE_B`, truncado para 24
   caracteres.
5. Pares repetidos sao consolidados em um unico caso.
6. A maior similaridade encontrada para o par e preservada.
7. `Possivel imovel duplicado` e `Revisao visual recomendada` entram na fila
   somente com similaridade maior ou igual a 80%. Os demais tipos nao usam esse
   corte.
8. Conversao de `Status_Validacao`:
   - contendo `desmembramento` ou `foto intrusa`: `Possivel desmembramento inconsistente`;
   - contendo `duplicata`: `Possivel imovel duplicado`;
   - contendo `fraude`: `Possivel inconsistencia de Backoffice`;
   - contendo `revisao` ou `alerta de proximidade`: `Revisao visual recomendada`;
   - `OK`, avisos, erros, incompletos e status desconhecidos nao geram caso.
9. Na política Azure aprovada em 13/10, pendentes ausentes podem ser arquivados
   (`ativo=false`), preservando avaliações e revalidando reservas no servidor.
   Ausentes avaliados ficam preservados. Não excluir fisicamente nem alternar
   para a política legado SQLite, que preserva ausentes.
10. Revisoes e historico feitos no aplicativo nunca devem ser substituidos pela
    carga da fonte.

Os textos acima estao sem acentos apenas nas regras tecnicas. Os valores gravados
pelo sistema continuam usando os rotulos atuais com acentuacao.

## Fotografias

O processamento atual extrai somente a primeira URL de cada um dos dois campos de
foto. Na migracao para o SQL Server, a fonte deve entregar o conteudo completo dos
campos, sem cortar URLs.

Para permitir todas as fotos no carrossel, recomenda-se um destes formatos:

1. tabela filha `FotosMatricula`, com uma linha por foto; ou
2. JSON contendo uma lista de URLs e o tipo/origem da foto.

Uma tabela filha e preferivel:

| Coluna sugerida | Descricao |
|---|---|
| `ID_Completo` | Matricula proprietaria da foto. |
| `URL_Foto` | URL completa da imagem. |
| `Tipo_Foto` | `propriedade`, `estrutura` ou outro tipo futuro. |
| `Ordem` | Ordem de exibicao. |
| `AtualizadoEm` | Controle incremental. |

URLs duplicadas para a mesma matricula devem ser eliminadas. O navegador deve
carregar inicialmente apenas a primeira imagem e buscar as demais sob demanda.

## Requisitos recomendados para a tabela/view no SQL Server

- Manter os nomes acima ou fornecer um mapeamento formal de nomes novos.
- Entregar os identificadores como texto, sem remover zeros, sufixos ou hifens.
- Entregar similaridade como numero decimal (`0` a `100`), de preferencia sem o
  caractere `%`.
- Usar `NULL` para dado ausente; nao usar textos como `NULL`, `N/A` ou `-`.
- Preservar URLs completas.
- Disponibilizar uma chave tecnica estavel por linha, se existir.
- Disponibilizar `AtualizadoEm` e, idealmente, `ExcluidoEm` ou indicador ativo
  para sincronizacao incremental segura.
- Permitir leitura consistente durante a carga, preferencialmente com snapshot.
- Criar indices para `ID_Completo`, `Codigo_Suspeito` e `AtualizadoEm`.

## Acesso necessario

O sincronizador precisara de:

- servidor/host e porta;
- nome do banco e schema;
- nome da tabela ou view;
- usuario de servico somente leitura;
- forma de autenticacao;
- driver ODBC instalado na maquina que executa a atualizacao;
- liberacao de rede/firewall;
- informacao sobre criptografia e certificado.

Credenciais nao devem ser gravadas no Git. Elas devem ficar em variaveis de
ambiente ou no gerenciador de segredos do ambiente de execucao.

## Estratégia de continuidade

O leitor Azure e a política de ausentes já existem no checkout local. A adoção foi
autorizada e iniciada; não retornar ao SQLite como fallback sem decisão e plano
específicos. Confirmar view completa, código entregue, configuração explícita e
estado das cargas. Preparar plano pelo contrato corrigido, preservar backups,
aplicar com proteção de reservas e verificar histórico/links. Detalhes no
[estado atual](STATUS_ATUAL.md) e no [manual](OPERACAO_E_MIGRACAO.md).

## Auditoria e acesso

A configuração deste computador seleciona Azure. Um clone sem configuração local
ainda usa o padrão legado SQLite; não operar antes de configurar a fonte correta.

Foram preparados dois meios de conferir a estrutura antes da migracao:

- `sql/AUDITAR_COLUNAS_FONTE_SQL_SERVER.sql`, para execucao manual no Azure SQL;
- `scripts/auditar_fonte_sql_server.py`, para auditoria automatizada somente de
  leitura usando um usuario de servico.

O auditor separa o resultado em dois niveis:

- `compativel_minimo`: possui as cinco colunas indispensaveis para formar a fila;
- `paridade_completa`: tambem possui enderecos, links, fotos, agente, observacoes
  e uma das colunas alternativas de situacao do Backoffice.

O leitor usa ODBC 18 e pode autenticar interativamente com a conta corporativa;
connection string não interativa é alternativa, não obrigação para a operação
manual. O sucessor precisa de acesso individual e rede aprovados. Instalar o
driver não concede leitura nem libera o firewall. Não há agendamento autônomo
configurado. Credenciais e configurações locais não são transferidas pelo Git.

### Estrutura confirmada em 01/10/2026

Seção histórica de homologação; os totais abaixo não são a contagem atual da view
ou do aplicativo. O objeto operacional usado depois passou a ser a view
`dbo.vw_desmembramentos`, não a tabela diretamente.

A fonte foi localizada em `VISITAS_CENSO.dbo.Base_Desmembramentos`. A consulta ao
`INFORMATION_SCHEMA.COLUMNS` retornou exatamente as 17 colunas deste contrato:
as 15 colunas fixas e as duas alternativas de situacao do Backoffice. Portanto,
a estrutura possui `compativel_minimo=true` e `paridade_completa=true`.

Todos os campos, exceto `ID_Completo`, aceitam nulo. `Percentual_Similaridade` e
`Data do registro` estao armazenados como `nvarchar(max)`. Isso e compativel com
a conversao atual, mas tipos numerico e de data seriam preferiveis em uma futura
view tipada. A tabela nao possui chave tecnica nem `AtualizadoEm`; inicialmente o
leitor precisara percorrer a fonte completa e comparar o resultado deterministico.

O proximo bloqueio nao e mais o schema, e sim a qualidade/preenchimento da base.
Use `sql/AUDITAR_QUALIDADE_FONTE_SQL_SERVER.sql` para medir campos vazios,
similaridades invalidas, autorreferencias e distribuicao dos status antes de
implementar a troca da fonte.

A auditoria de conteudo confirmou 263.611 linhas, 246.786 relacoes utilizaveis,
180.863 pares unicos e nenhuma referencia sem cadastro. Existem 65.923 pares
reciprocos repetidos, nenhum conflito de tipo e no maximo duas ocorrencias por
par. Com as regras atuais, 95.751 pares entram no escopo. Por decisao operacional,
`ALERTA DE PROXIMIDADE` e tratado como `Revisao visual recomendada` e, portanto,
somente entra com similaridade maior ou igual a 80%.
