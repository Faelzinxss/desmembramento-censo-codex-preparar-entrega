import json
import sqlite3
import sys
from pathlib import Path


caminho = Path(sys.argv[1]).resolve()
con = sqlite3.connect(f"{caminho.as_uri()}?mode=ro&immutable=1", uri=True)
try:
    status = con.execute(
        '''SELECT COALESCE(NULLIF(TRIM("Status_Validacao"), ''), '(vazio)') status, COUNT(*)
           FROM "Base_Desmembramentos" GROUP BY 1 ORDER BY 2 DESC'''
    ).fetchall()
    chaves = con.execute(
        '''SELECT COUNT(*) total,
                  COUNT(DISTINCT NULLIF(TRIM("ID_Completo"), '')) ids_completos,
                  COUNT(DISTINCT NULLIF(TRIM("registro_guid"), '')) registros_guid,
                  SUM(CASE WHEN TRIM(COALESCE("Codigo_Suspeito", '')) <> '' THEN 1 ELSE 0 END) com_suspeito
           FROM "Base_Desmembramentos"'''
    ).fetchone()
    amostra = con.execute(
        '''SELECT "ID_Completo", "Codigo_Suspeito", "Status_Validacao",
                  "Percentual_Similaridade", "Link Backoffice", "registro_guid"
           FROM "Base_Desmembramentos"
           WHERE TRIM(COALESCE("Codigo_Suspeito", '')) <> '' LIMIT 5'''
    ).fetchall()
    print(json.dumps({"status": status, "chaves": chaves, "amostra": amostra}, ensure_ascii=True))
finally:
    con.close()
