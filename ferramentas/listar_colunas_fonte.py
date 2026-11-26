from __future__ import annotations

import sqlite3
from pathlib import Path


BANCO = Path(__file__).resolve().parents[1] / "dados" / "fonte_municipio.db"
TABELA = "Base_Desmembramentos"


with sqlite3.connect(str(BANCO)) as conexao:
    colunas = [linha[1] for linha in conexao.execute(f'PRAGMA table_info("{TABELA}")')]

for indice, coluna in enumerate(colunas, start=1):
    print(f"{indice:03d}  {coluna}")
