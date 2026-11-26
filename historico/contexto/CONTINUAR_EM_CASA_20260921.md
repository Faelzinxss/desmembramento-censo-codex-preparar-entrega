# Continuar o projeto em casa — registro de 21/09/2026

## Estado confirmado em 21/09/2026

- O site em producao continua usando React/Vite no Cloudflare Pages e Supabase.
- A fila, reservas, Realtime, revisoes, historico, produtividade e painel de
  pendencias estao operacionais.
- A regra vigente inclui `Possivel imovel duplicado` e `Revisao visual
  recomendada` com similaridade maior ou igual a 80%.
- A correcao `sql/CORRIGIR_FILA_VAZIA_COM_PENDENTES.sql` foi executada em
  producao. O teste retornou 9 pendentes, 9 exibiveis, nenhuma matricula ausente,
  funcao valida e cache limpo.
- Essa correcao foi somente no Supabase e nao exige build do frontend.
- A base oficial atualizada em 21/09 as 16:54 tambem foi sincronizada. Ela possui
  223.634 registros de origem, 65.381 casos no escopo e 98.358 casos abaixo de
  80% fora da fila. A verificacao final retornou zero diferencas.
- O backup anterior a carga e
  `backups/backup_supabase_20260921_231236.json.gz`, com 3.501 revisoes, 14 perfis
  e 14 usuarios.

## Como retomar em casa

1. Abrir a pasta clonada do projeto.
2. Confirmar que nao existem alteracoes locais importantes com `git status`.
3. Executar `git pull --ff-only origin main`.
4. Ler este arquivo e `docs/STATUS_ATUAL.md` antes de alterar o projeto.
5. Para mudancas no frontend, executar `npm install` quando necessario e depois
   `npm run build` antes de enviar ao GitHub.

Nao copiar para o projeto arquivos com sufixo `-DEEP...` nem pastas
`_backup_conflito_onedrive_*`: sao copias de conflito do OneDrive, nao fontes do
build.

## Proxima mudanca de origem de dados

A equipe criara uma view de desmembramentos no SQL Server. O desenho combinado e:

`view SQL Server -> sincronizador -> Supabase -> aplicativo`

O aplicativo nao sera ligado diretamente ao SQL Server. O contrato de colunas,
regras e acesso esta em `docs/CONTRATO_FONTE_SQL_SERVER.md`.

Quando a view estiver pronta, solicitar servidor, porta, banco, schema, nome da
view, autenticacao, usuario somente leitura, senha, VPN e configuracao de
criptografia. As credenciais nao devem entrar no Git.

Antes de substituir o SQLite:

1. adaptar o leitor do sincronizador;
2. comparar SQL Server e o ultimo SQLite em paralelo;
3. validar totais, pares, matriculas, tipos, similaridades, fotos e links;
4. fazer uma carga de homologacao preservando revisoes e historico;
5. somente entao tornar o SQL Server a fonte oficial.

## Melhoria futura de fotos

Hoje o sistema conserva no maximo a primeira URL da foto da propriedade e a
primeira URL da estrutura por matricula. A futura integracao pode guardar todas as
URLs unicas, preferencialmente em uma tabela filha da view/origem. O frontend deve
carregar a primeira foto de imediato e as demais somente ao navegar pelas setas.
