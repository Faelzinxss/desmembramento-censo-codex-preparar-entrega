# Homologação da fonte Azure SQL

Este é o teste comparativo usado na transição, não o comando diário. O Azure já foi selecionado localmente; não voltar ao SQLite por causa de diferenças históricas. Para continuar a migração ou instalar outro computador, consulte [operação e migração](OPERACAO_E_MIGRACAO.md).

Com o ODBC Driver 18 x64 instalado, acesso de rede autorizado e conta com leitura na view:

```powershell
python scripts/testar_fonte_sql_server.py --usuario SEU_EMAIL_CORPORATIVO
```

O script solicita login Microsoft quando necessário, lê `dbo.vw_desmembramentos`
no banco `VISITAS_CENSO` e compara com o SQLite oficial encontrado pelo fluxo atual.
Não altera a fonte diária, não acessa o Supabase e só executa SELECT no Azure.

Cada execução cria uma pasta exclusiva em `dados/homologacao_sqlserver/`, ignorada
pelo Git, com snapshot, dois controles isolados e `comparacao.json`. Esses arquivos
contêm dados pessoais da fonte: não compartilhar nem publicar no Git.
Se a execução falhar, a pasta pode estar incompleta; somente a geração do relatório
final indica que a comparação terminou. Não usar esses arquivos como fonte oficial.

Executar fora da regeneração da view e da atualização do SQLite. As fontes podem
representar datas diferentes: casos somente no SQLite não devem ser excluídos.
Uma comparação bem-sucedida não autoriza publicação ou migração da produção.
O login interativo serve para homologação local, não para execução noturna autônoma.
