# Retomar após timeout no planejamento (08/10/2026)

> Roteiro histórico de diagnóstico de 08/10. A fonte passou a Azure e a função de planejamento recebeu alterações posteriores, incluindo a política de ausentes. **Não executar as instalações SQL abaixo sobre a função atual por tentativa:** podem substituir comportamento mais recente. Para um incidente atual, preservar carga/snapshot/backup, coletar etapa e erro, comparar a definição instalada e seguir [operação e migração](OPERACAO_E_MIGRACAO.md). Os arquivos citados podem ainda estar apenas no checkout local; conferir a entrega do código antes de usá-los.

Correções preparadas localmente; não aplicadas automaticamente ao Supabase.

1. Executar `sql/OTIMIZAR_PLANEJAMENTO_SINCRONIZACAO.sql` no SQL Editor.
   Esperado: `planejamento_otimizado_ok`, `servico_ok`, `acesso_restrito_ok` verdadeiros.
   Altera somente a função de planejamento, sem aplicar a carga. Cria tabelas
   temporárias apenas durante a execução, com descarte ao encerrar a transação.
   Mantém o limite de 90 segundos, as regras de escopo e os ausentes preservados.
   O gargalo provável é a consulta correlacionada com OR sobre reservas; a melhoria
   de desempenho ainda precisa ser medida no banco real.
2. Executar `sql/CORRIGIR_ATIVIDADE_VAZIA_PRIORIDADES.sql`, separadamente.
   Esperado: `normalizacao_ok = true` e a regra original com NULL e os dois tipos.
   Converte somente vazio em NULL antes da validação. Outros valores inválidos
   continuam rejeitados. Compatível com páginas antigas ainda abertas.
   Para a correção também chegar pelo frontend, publicar `src/main.jsx` atualizado.
3. Não executar a rotina diária automática ainda: ela avança até aplicação.
   Para testar somente o planejamento, na raiz do projeto:

   ```powershell
   python scripts/simular_sincronizacao_estagio.py
   ```

   O simulador reaproveita a carga pelo hash e pode reenviar o manifesto por upsert.
   Não altera casos nem matrículas operacionais. Não apagar estágio ou planos.
   Manter a base preparada atual, sem preparar outra versão entre plano e aplicação.
4. Conferir o plano retornado antes de autorizar a aplicação. Nunca usar um plano
   antigo após falha. Se houver novo timeout, parar e coletar query/context nos logs;
   não insistir nem aumentar limites globais.

Os scripts de instalação SQL usam lock_timeout de 5s: se ocorrer contenção,
a transação falha e deve ser repetida em momento menos movimentado.
Eles não exigem logout dos conferentes, mas a execução pode consumir recursos.
Não há garantia de impacto zero sob carga.

Verificações locais realizadas: testes Python e build Vite. Não substituem teste
de execução/performance no PostgreSQL de produção. Fonte diária segue SQLite;
nenhuma migração Azure SQL é feita por essas correções.
