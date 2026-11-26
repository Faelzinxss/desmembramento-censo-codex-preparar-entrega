from __future__ import annotations

import tomllib
from pathlib import Path

import requests


RAIZ = Path(__file__).resolve().parents[1]
config = tomllib.loads((RAIZ / ".streamlit" / "secrets.toml").read_text(encoding="utf-8"))["supabase"]
url = str(config["url"]).rstrip("/")
chave = str(config.get("secret_key") or config.get("service_role_key"))
headers = {"apikey": chave, "Authorization": f"Bearer {chave}", "Prefer": "count=exact"}

resposta = requests.get(
    f"{url}/rest/v1/matriculas",
    params={"select": "code,municipio,data_registro", "municipio": "not.is.null", "limit": "5"},
    headers=headers,
    timeout=30,
)
resposta.raise_for_status()
print("Content-Range:", resposta.headers.get("Content-Range"))
for registro in resposta.json():
    print(registro)
