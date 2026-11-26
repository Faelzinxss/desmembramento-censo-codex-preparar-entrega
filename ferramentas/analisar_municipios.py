from __future__ import annotations

import sqlite3
from pathlib import Path


BANCO = Path(__file__).resolve().parents[1] / "dados" / "fonte_municipio.db"
TABELA = "Base_Desmembramentos"
COLUNAS = (
    "cidade",
    "localidade",
    "nome_localidade",
    "municipio_alternativo",
    "municipio_secundario",
    "municipio_alternativo_metodo",
    "cidade_metodo",
    "contrato",
    "regiao_adm",
    "lote_imovel",
)


with sqlite3.connect(str(BANCO)) as conexao:
    conexao.execute("PRAGMA query_only = ON")
    total = conexao.execute(f'SELECT COUNT(*) FROM "{TABELA}"').fetchone()[0]
    print(f"Total de linhas: {total:,}")
    for coluna in COLUNAS:
        preenchidos, distintos = conexao.execute(
            f'''SELECT
                    COUNT(*) FILTER (WHERE NULLIF(TRIM(CAST("{coluna}" AS TEXT)), '') IS NOT NULL),
                    COUNT(DISTINCT NULLIF(TRIM(CAST("{coluna}" AS TEXT)), ''))
                FROM "{TABELA}"'''
        ).fetchone()
        print(f"\n{coluna}: {preenchidos:,} preenchidos ({preenchidos / total:.1%}); {distintos:,} distintos")
        expressao = f'TRIM(CAST("{coluna}" AS TEXT))'
        frequentes = conexao.execute(
            f'''SELECT {expressao} valor, COUNT(*) quantidade
                  FROM "{TABELA}"
                 WHERE NULLIF({expressao}, '') IS NOT NULL
                 GROUP BY {expressao} ORDER BY quantidade DESC LIMIT 12'''
        ).fetchall()
        print("  ", frequentes)

    conflitos = conexao.execute(
        f'''SELECT COUNT(*) FROM "{TABELA}"
             WHERE NULLIF(TRIM(cidade), '') IS NOT NULL
               AND NULLIF(TRIM(municipio_alternativo), '') IS NOT NULL
               AND UPPER(TRIM(cidade)) <> UPPER(TRIM(municipio_alternativo))'''
    ).fetchone()[0]
    print(f"\nConflitos cidade x municipio_alternativo: {conflitos:,}")

    amostras = conexao.execute(
        f'''SELECT ID_Completo, cidade, localidade, nome_localidade,
                   municipio_alternativo, municipio_secundario,
                   municipio_alternativo_metodo, cidade_metodo
              FROM "{TABELA}"
             WHERE NULLIF(TRIM(cidade), '') IS NOT NULL
                OR NULLIF(TRIM(municipio_alternativo), '') IS NOT NULL
             LIMIT 20'''
    ).fetchall()
    print("\nAmostras:")
    for amostra in amostras:
        print(amostra)

    todas_colunas = [linha[1] for linha in conexao.execute(f'PRAGMA table_info("{TABELA}")')]
    candidatas = [
        coluna for coluna in todas_colunas
        if any(termo in coluna.lower() for termo in (
            "contrato", "projeto", "cliente", "lote", "cidade", "municip", "regiao", "regional"
        ))
    ]
    print("\nColunas candidatas de contexto:")
    for coluna in candidatas:
        print(" ", coluna)

    print("\nTodas as colunas:")
    for coluna in todas_colunas:
        print(" ", coluna)
