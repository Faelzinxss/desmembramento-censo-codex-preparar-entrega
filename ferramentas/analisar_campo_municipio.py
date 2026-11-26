from __future__ import annotations

import sqlite3
from pathlib import Path


BANCO = Path(__file__).resolve().parents[1] / "dados" / "fonte_municipio.db"
TABELA = "Base_Desmembramentos"


with sqlite3.connect(str(BANCO)) as conexao:
    conexao.execute("PRAGMA query_only = ON")
    colunas = [linha[1] for linha in conexao.execute(f'PRAGMA table_info("{TABELA}")')]
    coluna = next(nome for nome in colunas if nome.startswith("1.4 Munic"))
    coluna_sql = coluna.replace('"', '""')
    total, preenchidos, distintos = conexao.execute(
        f'''SELECT COUNT(*),
                   COUNT(*) FILTER (WHERE NULLIF(TRIM(CAST("{coluna_sql}" AS TEXT)), '') IS NOT NULL),
                   COUNT(DISTINCT NULLIF(TRIM(CAST("{coluna_sql}" AS TEXT)), ''))
              FROM "{TABELA}"'''
    ).fetchone()
    valores = conexao.execute(
        f'''SELECT TRIM(CAST("{coluna_sql}" AS TEXT)) AS municipio, COUNT(*) AS quantidade
              FROM "{TABELA}"
             WHERE NULLIF(TRIM(CAST("{coluna_sql}" AS TEXT)), '') IS NOT NULL
             GROUP BY municipio
             ORDER BY quantidade DESC'''
    ).fetchall()
    coluna_metodo = next((nome for nome in colunas if nome.startswith("1.4 Munic") and nome.endswith("_metodo")), None)
    metodos = []
    if coluna_metodo:
        metodo_sql = coluna_metodo.replace('"', '""')
        metodos = conexao.execute(
            f'''SELECT TRIM(CAST("{metodo_sql}" AS TEXT)), COUNT(*)
                  FROM "{TABELA}"
                 WHERE NULLIF(TRIM(CAST("{metodo_sql}" AS TEXT)), '') IS NOT NULL
                 GROUP BY 1 ORDER BY 2 DESC'''
        ).fetchall()

print(f"Campo: {coluna}")
print(f"Total: {total:,}")
print(f"Preenchidos: {preenchidos:,} ({preenchidos / total:.1%})")
print(f"Distintos: {distintos:,}")
print(f"Métodos: {metodos}")
for municipio, quantidade in valores[:120]:
    print(f"{municipio}: {quantidade:,}")
