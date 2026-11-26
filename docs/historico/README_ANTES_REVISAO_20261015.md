# Histórico — README anterior à revisão de 15/10/2026

Documento preservado apenas para consulta histórica. Caminhos relativos e procedimentos podem estar desatualizados. Consulte o README da raiz e a documentação atual; não use este arquivo como roteiro operacional.

Aplicação web React/Vite publicada no Cloudflare e conectada ao Supabase.

A documentação completa da arquitetura, operação, perfis, dados, sincronização e
manutenção está em [`docs/DOCUMENTACAO_PROJETO.md`](docs/DOCUMENTACAO_PROJETO.md).
O ponto exato para continuar em outro computador está em
[`docs/STATUS_ATUAL.md`](docs/STATUS_ATUAL.md).
O roteiro para a primeira carga depois da ativação do Supabase Pro está em
[`docs/INICIAR_APOS_SUPABASE_PRO.md`](docs/INICIAR_APOS_SUPABASE_PRO.md).
O plano futuro para acelerar e reforçar a atualização diária está em
[`docs/PLANO_OTIMIZACAO_ATUALIZACAO.md`](docs/PLANO_OTIMIZACAO_ATUALIZACAO.md).
O plano e o estado da correção de concorrência estão em
[`docs/PLANO_SOL_CONCORRENCIA_E_DESEMPENHO.md`](docs/PLANO_SOL_CONCORRENCIA_E_DESEMPENHO.md).

## Pastas

- `src/`, `index.html` e `package.json`: aplicação usada pelos conferentes e supervisores.
- `scripts/`: preparação, sincronização, backup e administração local em Python.
- `docs/`: documentação técnica e operacional vigente.
- `publicacao_drive/`: nome histórico da pasta local com o SQLite preparado. Não há upload para Google Drive.
- `dados/`: arquivos locais usados durante a preparação.
- `sql/migracoes_aplicadas/`: histórico das alterações executadas no Supabase.
- `sql/`: somente auditorias e exportações que ainda podem ser usadas.
- `backups/`: backups operacionais locais; não são enviados ao Git.
- `ferramentas/`: diagnósticos auxiliares.
- `manutencao/`: desenvolvimento local e rotinas excepcionais ainda válidas.
- `historico/`: protótipos e correções encerradas; não executar em produção.
- `_arquivo_legado/`: implementação Streamlit e rotinas antigas, fora de uso.

## Atualização da base

Execute `ATUALIZAR_BASE_DIARIA.bat`. Ele prepara a base, simula as alterações e
aguarda a confirmação digitada `ATUALIZAR`. Depois cria e valida o backup,
sincroniza o Supabase e faz uma segunda simulação. Cada execução salva um relatório
em `logs/atualizacoes/` e uma trava impede duas atualizações simultâneas.

A base de origem é localizada tanto no caminho do computador da empresa quanto no
OneDrive da máquina atual. Para outro local, defina a variável
`DESMEMBRAMENTO_BANCO_FONTE` com o caminho completo do arquivo `.db`.

Os três BATs antigos ficam em `manutencao/rotinas_manuais/` para diagnóstico.

O sincronizador é acumulativo: insere pares novos, atualiza os conhecidos,
reativa os que reaparecerem e mantém os casos ausentes na carga do dia. Revisões
e históricos são preservados. A desativação por ausência existe somente na
reconciliação excepcional e mantém a proteção contra redução acidental superior
a 20% dos casos ativos. Consulte `docs/SINCRONIZACAO_ACUMULATIVA.md`.

O município vem de `1.4 Município_field` do SQLite de origem, já tratado pelo
gerador da base. Não há correção aproximada ou consulta ao IBGE. `municipio_a`
e `municipio_b` são cópias dos municípios das duas matrículas comparadas.
Não execute sincronizadores em paralelo. Uma falha pode deixar alguns blocos já aplicados;
faça outra simulação antes de retomar.

A origem automática é exclusivamente a pasta oficial
`BASE_UNIFICADA_DESMEMBRAMENTOS`; cópias soltas da Área de Trabalho são rejeitadas.
Uma reconciliação massiva nunca deve usar o BAT diário. Após confirmar capacidade
do Supabase, use somente `manutencao/RECONCILIAR_BASE_OFICIAL.bat`; ele exige uma
confirmação diferente, executa backup e preserva o bloqueio da rotina normal.

## Publicação do site

Alterações no código: validar com `npm run build`, revisar e enviar ao GitHub.
A integração existente do Cloudflare publica o site. Atualizar os dados do
Supabase não exige novo deploy e não exige upload manual do SQLite.

## Manutenção da base

Execute `sql/AUDITAR_LIMPEZA_BASE.sql` no SQL Editor para medir espaço e possíveis
sobras. O arquivo é somente leitura. Casos inativos não são automaticamente lixo;
preserve os que possuem revisões ou reservas. Não use exclusão em cascata.

## Backup

Execute `manutencao/FAZER_BACKUP_SUPABASE.bat`. O arquivo é validado automaticamente e fica
em `backups/`. Consulte `manutencao/RESTAURAR_BACKUP.md` antes de qualquer restauração.

## Desenvolvimento local

Na instalação inicial use `manutencao/CONFIGURAR_AMBIENTE.bat`.
Para desenvolver use `manutencao/INICIAR_WEB.bat`. A configuração pública é gerada em `.env.local`.
Chaves privadas nunca devem ser incluídas no frontend nem enviadas ao GitHub.

Para continuar o trabalho em outro computador, comece por `docs/DOCUMENTACAO_PROJETO.md`.
