# Início da operação após ativar o Supabase Pro

> Roteiro histórico de ativação/carga inicial. Não executar como instalação ou retomada atual. A fonte selecionada passou a Azure, há políticas e correções posteriores e o banco pode conter avaliações em produção. Consulte [estado atual](STATUS_ATUAL.md) e [operação e migração](OPERACAO_E_MIGRACAO.md).

Este é o roteiro operacional para concluir a carga da base oficial e liberar o
uso do aplicativo depois que o plano compatível estiver ativo. Não execute a
reconciliação enquanto o projeto ainda estiver no plano Free.

> Reconciliação concluída em 16/09/2026. A verificação final retornou zero
> matrícula alterada, zero caso alterado e zero desativação pendente. Este arquivo
> permanece como registro e roteiro para uma eventual reconciliação futura.

## Resultado esperado

A reconciliação acrescentará às matrículas os campos de complemento, observação
de origem e foto da estrutura, conciliará os casos com a base SQLite oficial e
preservará usuários, revisões, histórico de reavaliações e reservas.

A última simulação registrada em 14/09/2026 encontrou:

- 207.855 matrículas na origem;
- 198.478 matrículas com pelo menos um dos novos campos;
- 100.489 casos novos ou alterados;
- 71.646 casos ativos a desativar, equivalentes a 51,2% da carga anterior.

Esses números são uma referência, não uma autorização automática. A nova
simulação deve ser conferida antes do envio.

## 1. Antes da carga

1. Confirme no painel do Supabase que o upgrade já está ativo, o banco aceita
   escrita e existe espaço suficiente para a carga e para o crescimento futuro.
2. Avise a equipe e faça a operação fora do período de produção. Durante a
   reconciliação, ninguém deve revisar casos e nenhuma outra sincronização pode
   estar em execução.
3. Confirme que o arquivo de origem é exatamente:

   ```text
   DEEPESSOAS\PROJETOS - SABESP - CENSO RURAL\EXECUÇÃO\RELATORIOS\DADOS\_CLIENTE\BASE\_UNIFICADA_DESMEMBRAMENTOS\Banco de dados - Desmembramentos.db
   ```

4. Atualize a cópia local do projeto a partir da branch `main` e confirme que
   `.streamlit/secrets.toml` contém a URL e a chave privada corretas do Supabase.
5. Execute `manutencao/FAZER_BACKUP_SUPABASE.bat`. Só prossiga quando o programa confirmar
   que o backup foi criado e validado em `backups/`.
6. No Supabase SQL Editor, execute `sql/AUDITAR_PRONTIDAO_PRODUCAO.sql` e confirme
   que todas as colunas de validação retornam `true`, sem revisões órfãs,
   matrículas ausentes ou perfis inválidos.

## 2. Simular e reconciliar

Execute somente:

```text
manutencao\RECONCILIAR_BASE_OFICIAL.bat
```

O programa fará automaticamente:

1. preparação da base web local;
2. simulação sem escrita;
3. exibição das quantidades que serão alteradas;
4. solicitação da frase `RECONCILIAR BASE OFICIAL`;
5. novo backup validado;
6. envio incremental em lotes;
7. desativação lógica dos casos ausentes;
8. atualização dos caches dos filtros;
9. segunda simulação para conferência.

Antes de digitar a frase, confira os totais exibidos. As desativações são
esperadas porque a origem oficial substitui uma carga anterior divergente, mas
uma diferença relevante em relação à referência acima deve ser investigada.

Não execute diretamente `sincronizar_supabase_web.py --enviar
--desativar-ausentes --permitir-desativacao-massiva`. O BAT excepcional acrescenta confirmação,
backup, trava contra execuções paralelas e verificação final.

## 3. Quando interromper

Não confirme ou interrompa a operação se ocorrer qualquer uma destas situações:

- o caminho exibido não pertence a `BASE_UNIFICADA_DESMEMBRAMENTOS`;
- a quantidade de matrículas ou casos estiver inesperadamente baixa;
- a quantidade de desativações diferir muito da simulação conhecida sem uma
  alteração explicável na base oficial;
- o backup falhar ou não for validado;
- o Supabase indicar falta de espaço, modo somente leitura ou erro persistente;
- houver outra atualização ou trabalho da equipe em andamento.

Se houver falha durante o envio, não apague registros e não restaure o backup
imediatamente. Guarde o relatório em `logs/atualizacoes/` e execute novamente a
simulação; o sincronizador é incremental e mostrará o que ainda falta.

## 4. Validação depois da carga

1. Na verificação automática final, confirme que matrículas e casos
   novos/alterados ficaram próximos de zero e que não restam desativações a
   aplicar.
2. Execute novamente `sql/AUDITAR_PRONTIDAO_PRODUCAO.sql`.
3. Abra o aplicativo como administrador e confira totais e filtros de pelo menos
   dois municípios e dois tipos de ocorrência.
4. Abra casos publicados e valide:
   - complemento;
   - observação de origem;
   - foto da propriedade;
   - foto da estrutura e navegação do carrossel;
   - casos que possuem somente uma foto.
5. Entre com uma conta de conferente e teste abrir, salvar e rever um caso.
6. Confirme que a revisão aparece na produtividade e que o monitoramento mostra
   corretamente a atividade.
7. Teste uma revisão inconclusiva, a revisita desse caso e uma duplicidade com a
   indicação de exclusão da matrícula A ou B.
8. Libere a equipe somente depois dessas verificações.

## 5. Depois da primeira reconciliação

As próximas atualizações normais devem voltar a usar:

```text
ATUALIZAR_BASE_DIARIA.bat
```

O modo de reconciliação é excepcional e não deve virar rotina. Preserve o backup
e o relatório da primeira carga no Pro. A remoção definitiva da tabela legada
`distribuicoes` deve ser feita somente após um período estável de produção e uma
auditoria específica de dependências.
