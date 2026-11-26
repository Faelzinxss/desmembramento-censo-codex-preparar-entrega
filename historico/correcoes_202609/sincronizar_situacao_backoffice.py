from __future__ import annotations

import sqlite3
import tomllib
from pathlib import Path

import requests


RAIZ = Path(__file__).resolve().parent
FONTE = RAIZ / "dados" / "fonte_municipio.db"
BASE_WEB = RAIZ / "publicacao_drive" / "base_web.db"
SECRETS = RAIZ / ".streamlit" / "secrets.toml"
LOTE = 1000


def texto(valor) -> str | None:
    resultado = str(valor or "").strip()
    return resultado or None


def carregar() -> list[dict]:
    with sqlite3.connect(str(BASE_WEB)) as web:
        codigos = {
            codigo
            for linha in web.execute("select code_a, code_b from casos")
            for codigo in linha
        }
    situacoes: dict[str, str | None] = {}
    with sqlite3.connect(str(FONTE)) as fonte:
        for codigo, situacao in fonte.execute(
            '''select "ID_Completo", "Situação Backoffice - Visita"
                 from "Base_Desmembramentos"
                where nullif(trim("ID_Completo"), '') is not null'''
        ):
            codigo = texto(codigo)
            if codigo in codigos:
                situacoes[codigo] = texto(situacao)
    return [{"code": codigo, "situacao_backoffice": situacoes.get(codigo)} for codigo in sorted(codigos)]


def enviar(registros: list[dict]) -> None:
    config = tomllib.loads(SECRETS.read_text(encoding="utf-8"))["supabase"]
    url = str(config["url"]).rstrip("/")
    chave = str(config.get("secret_key") or config.get("service_role_key"))
    headers = {
        "apikey": chave,
        "Authorization": f"Bearer {chave}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    total_lotes = (len(registros) + LOTE - 1) // LOTE
    with requests.Session() as sessao:
        for inicio in range(0, len(registros), LOTE):
            numero = inicio // LOTE + 1
            resposta = sessao.post(
                f"{url}/rest/v1/matriculas",
                params={"on_conflict": "code"},
                headers=headers,
                json=registros[inicio : inicio + LOTE],
                timeout=90,
            )
            resposta.raise_for_status()
            if numero == 1 or numero % 20 == 0 or numero == total_lotes:
                print(f"Lote {numero}/{total_lotes}", flush=True)


if __name__ == "__main__":
    registros = carregar()
    preenchidos = sum(registro["situacao_backoffice"] is not None for registro in registros)
    print(f"Matrículas: {len(registros):,}; situações preenchidas: {preenchidos:,}")
    enviar(registros)
    print("Situações do Backoffice sincronizadas.")
