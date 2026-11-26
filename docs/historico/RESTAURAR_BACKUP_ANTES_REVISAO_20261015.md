# Histórico — Restauração de backup anterior à revisão de 15/10/2026

Não usar como procedimento atual. As premissas de reconstrução por SQLite e cobertura de backup precisam da revisão em `../../manutencao/RESTAURAR_BACKUP.md`. Caminhos relativos abaixo são históricos.

O arquivo gerado por `manutencao/FAZER_BACKUP_SUPABASE.bat` contém revisões vigentes,
histórico de reavaliações, perfis, distribuições legadas, sincronizações (quando
essa tabela existir) e
metadados dos usuários do Supabase Auth.
Fotos, matrículas e casos não são incluídos porque podem ser reconstruídos pela
base SQLite e pelo sincronizador incremental.

## Antes de restaurar

1. Não restaure sobre a produção sem criar uma cópia do estado atual.
2. Valide o arquivo com `python scripts/backup_supabase.py --validar arquivo.json.gz`.
3. Crie ou selecione o projeto Supabase de destino e execute os SQLs de estrutura.
4. Confira manualmente as quantidades exibidas pela validação.

## Ordem de restauração

1. Recriar os usuários no Supabase Auth. As senhas não são exportáveis e deverão ser redefinidas.
2. Restaurar `perfis`, preservando os mesmos UUIDs dos usuários.
3. Restaurar `sincronizacoes`.
4. Recriar a fila a partir da base SQLite e executar o sincronizador.
5. Restaurar `revisoes_historico`.
6. Restaurar `revisoes` com o gatilho de histórico temporariamente desabilitado
   durante a carga controlada.
7. Restaurar `distribuicoes` somente enquanto essa estrutura legada existir.
8. Reabilitar o gatilho e conferir contagens, permissões e um teste com dois usuários.

A restauração é deliberadamente manual nesta etapa para impedir que um clique
acidental sobrescreva a base de produção.
