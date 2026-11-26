import json
import sqlite3
import sys
from pathlib import Path


caminho = Path(sys.argv[1]).resolve()
con = sqlite3.connect(f"{caminho.as_uri()}?mode=ro&immutable=1", uri=True)
try:
    tabelas = [
        linha[0]
        for linha in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    print(json.dumps({"tabelas": tabelas}, ensure_ascii=True))
    for tabela in tabelas:
        nome = tabela.replace('"', '""')
        total = con.execute(f'SELECT COUNT(*) FROM "{nome}"').fetchone()[0]
        colunas = con.execute(f'PRAGMA table_info("{nome}")').fetchall()
        indices = con.execute(f'PRAGMA index_list("{nome}")').fetchall()
        print(json.dumps({"tabela": tabela, "total": total, "colunas": colunas, "indices": indices}, ensure_ascii=True))
finally:
    con.close()
