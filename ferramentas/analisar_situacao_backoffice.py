from __future__ import annotations

import sqlite3
from pathlib import Path


BANCO = Path(__file__).resolve().parents[1] / "dados" / "fonte_municipio.db"
TABELA = "Base_Desmembramentos"
CANDIDATAS = (
    "Situação Backoffice - Visita",
    "Situação Backoffice do Bloco",
    "Situação Backoffice",
)


with sqlite3.connect(str(BANCO)) as conexao:
    conexao.execute("PRAGMA query_only = ON")
    colunas = {linha[1] for linha in conexao.execute(f'PRAGMA table_info("{TABELA}")')}
    total = conexao.execute(f'SELECT COUNT(*) FROM "{TABELA}"').fetchone()[0]
    print(f"Total: {total:,}")
    for coluna in CANDIDATAS:
        if coluna not in colunas:
            print(f"\nAusente: {coluna}")
            continue
        coluna_sql = coluna.replace('"', '""')
        preenchidos, distintos = conexao.execute(
            f'''SELECT COUNT(*) FILTER (WHERE NULLIF(TRIM(CAST("{coluna_sql}" AS TEXT)), '') IS NOT NULL),
                       COUNT(DISTINCT NULLIF(TRIM(CAST("{coluna_sql}" AS TEXT)), ''))
                  FROM "{TABELA}"'''
        ).fetchone()
        print(f"\n{coluna}: {preenchidos:,} preenchidos; {distintos:,} distintos")
        for valor, quantidade in conexao.execute(
            f'''SELECT TRIM(CAST("{coluna_sql}" AS TEXT)), COUNT(*)
                  FROM "{TABELA}"
                 WHERE NULLIF(TRIM(CAST("{coluna_sql}" AS TEXT)), '') IS NOT NULL
                 GROUP BY 1 ORDER BY 2 DESC'''
        ):
            print(f"  {valor}: {quantidade:,}")
