from __future__ import annotations

import sqlite3
from pathlib import Path


BANCOS = list(Path(__file__).resolve().parents[1].rglob("*.db"))
BANCOS.append(
    Path(
        r"C:\Users\JoãoPedroAlmeidaChav\DEEPESSOAS\PROJETOS - SABESP - CENSO RURAL\EXECUÇÃO\RELATORIOS"
        r"\DADOS_CLIENTE\BASE_UNIFICADA_DESMEMBRAMENTOS\Banco de dados - Desmembramentos.db"
    )
)

for banco in BANCOS:
    if not banco.exists():
        continue
    print(f"DB: {banco}")
    with sqlite3.connect(str(banco)) as conexao:
        conexao.execute("PRAGMA query_only = ON")
        tabelas = conexao.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
        for (tabela,) in tabelas:
            colunas = [linha[1] for linha in conexao.execute(f'PRAGMA table_info("{tabela}")')]
            encontradas = [
                coluna
                for coluna in colunas
                if any(termo in coluna.lower() for termo in ("municip", "cidade", "localidade"))
            ]
            if encontradas:
                print(f"  {tabela}: {', '.join(encontradas)}")
