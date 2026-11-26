# Lotes — mapeamento local e proposta

> Atualização 04/09/2026: o texto abaixo é o histórico do mapeamento inicial.
> LOTES_01 foi posteriormente aplicada pelo usuário. LOTES_02_SNAPSHOT está
> preparada localmente e não aplicada. Consulte a atualização em PLANO_LOTES.md.

Estado: inspeção local e CSV remoto conferidos. Exportação com 131 linhas:
58 colunas, 17 constraints, 20 funções, 23 índices, 5 políticas, 6 RLS e 2 triggers.
Primeira estrutura aditiva preparada em sql/LOTES_01_ESTRUTURA.sql; não aplicada.

## Confirmações e cuidados do banco real

- salvar_revisao_web usa seis argumentos e aceita Falso positivo; preservar essa versão.
- reservar_caso_web reserva por caso por 30 minutos; renovar requer mesmo usuário/sessão.
- Os triggers de escopo estão instalados em reservas e revisoes.
- A leitura direta de casos, matriculas, reservas e revisoes usa usuario_ativo(),
  não o recorte da fila. Antes do piloto revisar RLS e grants para que lotes não
  sejam apenas um filtro visual. CSV não contém grants completos nem a definição
  de usuario_ativo(); buscar esses itens antes dessa alteração de segurança.
- perfis admite gestor, mas as RPCs de gestão atuais verificam admin. Nesta fase
  não ampliar automaticamente as permissões de gestor.
- Estrutura proposta permanece sem políticas/grants de acesso para o navegador.

## Pontos de integração encontrados

| Área | Implementação local | Mudança necessária |
| --- | --- | --- |
| Supervisor | src/main.jsx: listar_distribuicoes_detalhadas_web, simular_distribuicao_web, salvar/editar/remover_distribuicao_web | Nova prévia e confirmação separadas do CRUD legado |
| Fila | buscar_fila_web em ORDENAR_CASOS_RELACIONADOS.sql usa EXISTS em distribuicoes | Aplicar o mesmo escopo dos lotes usado nas operações de escrita |
| Autorização | usuario_pode_acessar_caso_web e triggers em PROTEGER_DISTRIBUICOES_NO_BANCO.sql | Centralizar precedência lote/legado; impedir bypass pelas distribuições antigas |
| Reserva | reservas tem caso_id como PK; reservar_caso_web recebe caso e sessão | Exclusividade por caso não resolve A–B versus A–C; validar vínculo de matrículas e concorrência |
| Conclusão | salvar_revisao_web exige reserva e acessos, grava revisoes por caso e remove reserva | Preservar validações e autoria; usar lote só para responsabilidade, não como autor |
| Painel | resumo_fila_web/contar_fila_filtrada_web em ESTABILIZAR_CONTAGENS_FILA.sql fazem contagens globais | Separar visão global do supervisor e saldo autorizado do analista |
| Produtividade | produtividade_diaria_web usa revisoes.usuario_id e revisado_em | Manter autoria real independentemente de transferência de lote |
| Sincronização | sincronizar_supabase_web.py atualiza registros e marca ausentes inativos | Associações fora do payload; detectar relações novas e suspender conflitos antes de servir casos |

Os arquivos SQL são evidência local, não comprovação de quais versões estão
instaladas. Existem funções sobrescritas por scripts posteriores (inclusive
salvar_revisao_web e produtividade_diaria_web, atualizadas para falso positivo).
Não substituir uma função a partir de uma versão histórica sem comparar o banco.

## Proposta aditiva (ainda não é migração)

- lotes: identificação, recorte original, responsável, criador, estado e datas.
- lote_casos: caso_id único na associação corrente, lote_id e data de entrada.
  Transferência atualiza vínculo corrente e grava evento, não duplica o caso.
- lote_matriculas: propriedade operacional por matrícula para impedir dois donos.
  Necessário discutir fechamento/reabertura e retenção antes de definir constraints.
- lote_eventos: operações de criação/transferência com ator e data; não copiar fotos,
  detalhes dos casos ou revisões. Preferir referência a operação coletiva.
- Confirmação: identificador idempotente; revalidar todo o grupo e reservas numa
  transação. Ordem fixa de locks e mecanismo comum à sincronização/reservas.
- RLS e grants mínimos desde a criação; tabelas não serão liberadas para escrita
  direta do navegador. RPCs autenticadas validam supervisor e analistas ativos.

## Transição proposta

1. Criar estrutura inativa: nenhuma alteração de acesso antes de testes.
2. Pilotar recorte explícito sem reservas vigentes, com confirmação do supervisor.
3. Caso/matrícula sob lote tem precedência sobre distribuição antiga: vínculo
   legado nunca pode liberar caso de outro responsável.
4. Fora do piloto, manter distribuição atual. Casos novos conectados ao piloto
   devem ficar bloqueados para triagem, inclusive para caminhos legados.
5. Administrador mantém supervisão, mas não ignora reservas de outro usuário.
6. Desligar recurso exige impedir novas operações e tratar reservas abertas;
   não simplesmente voltar às permissões antigas durante trabalhos concorrentes.

## Contagens propostas

Total do lote = concluídos + pendentes ativos + inativos não concluídos.
Em revisão é subconjunto dos pendentes ativos, não somado novamente.
Uma conclusão mantém a autoria de revisoes; responsável atual do lote é outra dimensão.
Para município, casos que têm A/B em municípios distintos podem aparecer em ambas
as visões: usar caso_id distinto por município e não somar municípios como total global.

## Próxima ação

Exportar CSV da auditoria estrutural (sem limite de 100 linhas) e comparar as
definições remotas com este mapeamento. Depois implementar migração aditiva com
testes PostgreSQL de concorrência/RLS antes de liberar as telas.
Não foi executada consulta remota nem alterado banco ou frontend nesta etapa.
