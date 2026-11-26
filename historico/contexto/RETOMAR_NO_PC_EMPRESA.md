# Retomar no computador da empresa

Atualizado em 07/09/2026. Este é o ponto oficial de retomada do projeto.

## 1. Trazer o trabalho do GitHub

Espere o OneDrive concluir a sincronização e abra um terminal na pasta do projeto.

```powershell
git status --short
git pull --ff-only origin main
git log -1 --oneline
```

Se o primeiro comando mostrar alterações, não use `reset`, não apague arquivos e
não force o `pull`. Abra o projeto no Codex e peça para comparar o estado local com
`origin/main`. O GitHub é a referência para o código; `.env.local`, backups, bases
e relatórios permanecem locais.

Na primeira execução no computador, se necessário:

```powershell
python -m pip install -r requirements-local.txt
npm ci
```

## 2. Estado atual de produção

- Site React/Vite publicado automaticamente pelo Cloudflare a partir da `main`.
- Supabase continua usando distribuição por município, tipo e similaridade.
- Vários analistas podem receber o mesmo município.
- O primeiro que abre um caso mantém a reserva exclusiva; outra conta não consegue abri-lo.
- A reserva dura 30 minutos e o site a renova a cada 5 minutos enquanto a análise está aberta.
- A fila do segundo analista pula casos ocupados e atualiza quando encontra uma reserva alheia.
- O analista possui listas visuais de `Disponíveis`, `Em análise` e `Concluídos`.
- A lista `Em análise` mostra o responsável e desabilita o botão com `Em uso`.
- Resumo e paginação respeitam somente os municípios atribuídos ao analista.
- A proposta de lotes foi encerrada. Nunca executar `sql/LOTES_04_ATIVAR_FILA.sql`.

## 3. Piloto configurado

- Analistas: Gabriel Dias e João Teste.
- Município: APIAÍ.
- Tipo: todos.
- Similaridade mínima: 80%.
- Aproximadamente 710 casos no recorte.
- O bloqueio ao tentar abrir o mesmo caso em contas diferentes já foi confirmado.

Ainda conferir no site publicado:

1. Os contadores de cada conta mostram apenas o recorte atribuído.
2. A lista `Em análise` mostra o caso e o responsável correto.
3. Uma decisão de teste salva normalmente e abre o próximo caso disponível.
4. Fechar sem salvar libera o caso para a outra conta.

## 4. Atualização diária

A única origem válida é a base da pasta oficial
`PROJETOS - SABESP - CENSO RURAL/EXECUÇÃO/RELATORIOS/DADOS_CLIENTE/BASE_UNIFICADA_DESMEMBRAMENTOS`.
O código não aceita mais uma cópia solta de `Área de Trabalho`, pois isso fez o
Supabase ser comparado com duas versões diferentes entre computadores.
Para corrigir especificamente essa divergência existe
`manutencao/RECONCILIAR_BASE_OFICIAL.bat`. Não executar enquanto o projeto estiver
no Free sem capacidade confirmada. A rotina diária continua protegida e não aceita
desativação massiva.

Usar somente `ATUALIZAR_BASE_DIARIA.bat` na rotina. Ele:

1. localiza a base no caminho da empresa ou no OneDrive;
2. prepara a base local;
3. simula as diferenças;
4. exige que o operador digite `ATUALIZAR`;
5. cria e valida um backup;
6. envia somente registros novos ou alterados;
7. simula novamente para conferir;
8. grava o relatório em `logs/atualizacoes/`;
9. impede duas execuções simultâneas.

A última simulação de 07/09/2026 encontrou 82 matrículas novas/alteradas, 219 casos
novos/alterados e 0 desativações. Essa simulação foi somente leitura; confirmar se
a atualização real já foi executada antes de rodar novamente.

Os casos novos entram automaticamente nas filas pelas regras já cadastradas. Não é
necessário recriar a distribuição diariamente.

## 5. Limpeza da proposta de lotes

A primeira limpeza foi corretamente bloqueada porque havia um snapshot temporário
expirado com 139.940 casos e 28 páginas. O script
`sql/REMOVER_ESTRUTURA_LOTES_INATIVA.sql` foi ajustado para apagar esse cache e
continua bloqueando a operação se houver lote ou vínculo permanente. Confirmar se a
segunda execução retornou as sete colunas como `NULL`. Essa limpeza não bloqueia o piloto.

## 6. Arquivos da raiz

- `ATUALIZAR_BASE_DIARIA.bat`: único botão da atualização diária.
- `manutencao/FAZER_BACKUP_SUPABASE.bat`: backup avulso quando necessário.
- `README.md`: operação geral.
- `RETOMAR_NO_PC_EMPRESA.md`: estado e próximos passos.
- Arquivos `.py`, `package*.json`, `vite.config.js`, `index.html` e pastas `src/`,
  `sql/`, `tests/`: implementação ativa.
- `manutencao/`: histórico, rotinas manuais e correções extraordinárias.
