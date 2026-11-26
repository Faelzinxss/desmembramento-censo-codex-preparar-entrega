# Recebimento da base SQLite corrigida

Este roteiro deve ser seguido quando a equipe informar que executou novamente o
código de geração da base oficial. O objetivo é descobrir se a redução observada
em 16/09/2026 foi um erro de geração antes de fazer nova escrita ou limpeza.

## Estado de comparação

A carga potencialmente incompleta de 16/09/2026 continha:

- 147.635 linhas no SQLite;
- 133.468 matrículas relacionadas a apontamentos;
- 97.403 casos únicos;
- 94.134 casos anteriores marcados como inativos no Supabase.

Esses casos e suas matrículas não foram apagados. O SQL de limpeza está bloqueado.

## Quando a nova base chegar

1. Confirmar que o arquivo foi concluído e não está mais sendo escrito.
2. Confirmar que ele está no caminho oficial
   `DADOS_CLIENTE\BASE_UNIFICADA_DESMEMBRAMENTOS`.
3. Manter `sql/INICIAR_OPERACAO_LIMPA.sql` bloqueado.
4. Criar um novo backup com `manutencao/FAZER_BACKUP_SUPABASE.bat`.
5. Preparar a base local:

   ```text
   python scripts\preparar_base_web.py
   ```

6. Executar somente a simulação abaixo. A opção permite medir uma diferença
   massiva, mas, sem `--enviar`, não modifica o Supabase:

   ```text
   python scripts\sincronizar_supabase_web.py --desativar-ausentes --permitir-desativacao-massiva
   ```

7. Registrar e comparar:
   - matrículas totais, novas e existentes alteradas;
   - casos totais, novos, reativados e existentes alterados;
   - casos ativos que ainda seriam desativados.

## Como interpretar

### Muitos casos forem reativados

Isso confirma que a base de 16/09 estava incompleta. Conferir se os totais se
aproximam das cargas anteriores, que tinham entre 139.940 e 146.597 casos. Depois
da confirmação, executar novamente a reconciliação excepcional. Não fazer limpeza
de casos ou matrículas.

### A base continuar perto de 97.403 casos

Não concluir automaticamente que a redução é correta. Pedir à equipe geradora a
quantidade esperada e a razão da mudança. Somente após confirmação formal fazer
uma nova reconciliação e considerar a limpeza.

### Surgirem novas desativações relevantes

Interromper. Conferir a geração, o caminho e a data do arquivo. Não enviar e não
apagar registros.

## Depois de uma reconciliação validada

1. A verificação final deve retornar zero para matrículas alteradas, casos
   alterados e desativações pendentes.
2. Testar filtros e abrir casos de municípios conhecidos.
3. Aguardar uma segunda atualização consistente ou confirmação definitiva da
   equipe responsável pela origem.
4. Somente então remover o bloqueio da limpeza dos testes e dos dados realmente
   órfãos.

## Simulação de 16/09/2026 após nova preparação

A base oficial foi preparada novamente e passou a produzir:

- 207.855 matrículas únicas;
- 152.050 casos;
- 249,4 MB de payload JSON estimado.

A comparação com o Supabase, executada sem `--enviar`, encontrou:

- 18.199 matrículas novas;
- 98.223 matrículas existentes alteradas;
- 73.394 casos novos;
- 33.453 casos reativados;
- 14.924 casos ativos alterados;
- 52.200 casos ativos que seriam desativados.

O retorno dos casos confirma que a preparação anterior estava incompleta. No
entanto, as 52.200 desativações ainda são uma divergência massiva. Por isso,
nenhuma alteração foi enviada. Antes da reconciliação, confirmar com a origem se
152.050 é o total esperado e investigar por que tantos pares antigos deixaram de
existir ou receberam outro `caso_id`.

## Reconciliação oficial de 17/09/2026

A geração de 17/09/2026 foi confirmada como a nova fonte oficial e reconciliada
com o Supabase após backup íntegro. A carga definitiva continha:

- 212.148 matrículas únicas;
- 155.176 casos;
- 254,6 MB de payload JSON estimado.

Foram processados 23.199 cadastros novos de matrícula, 77.217 casos novos,
33.104 reativações e 52.548 desativações de pares ausentes na nova fonte. As
revisões e o histórico existentes foram preservados.

O primeiro envio de casos encontrou respostas HTTP 500 com lotes de 1.000
registros. A rotina foi tornada retomável com lotes de 200 casos; a continuação
concluiu normalmente. A simulação final retornou zero para matrículas alteradas,
casos alterados, reativações e desativações pendentes. A base está liberada para
uso operacional.
