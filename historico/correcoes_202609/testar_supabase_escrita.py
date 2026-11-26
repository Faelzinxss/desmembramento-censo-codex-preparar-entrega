from __future__ import annotations

import sys
import tomllib
import uuid
from pathlib import Path

import requests


secrets = tomllib.loads((Path(__file__).parent.parent / ".streamlit" / "secrets.toml").read_text(encoding="utf-8"))
config = secrets.get("supabase", {})
url = str(config.get("url", "")).rstrip("/")
chave = str(config.get("secret_key", ""))
if not url or not chave:
    raise SystemExit("Configuração do Supabase incompleta.")

headers = {"apikey": chave, "Content-Type": "application/json"}
for tabela in ("usuarios", "revisoes", "sincronizacoes"):
    resposta = requests.get(f"{url}/rest/v1/{tabela}?select=*&limit=1", headers=headers, timeout=20)
    resposta.raise_for_status()

caso_id = "TESTE-" + uuid.uuid4().hex
registro = {
    "caso_id": caso_id,
    "code_a": "TESTE-A",
    "code_b": "TESTE-B",
    "decisao": "Inconclusivo",
    "observacao": "Registro automático de validação; deve ser removido.",
    "revisor_nome": "Teste de conexão",
    "versao_base": "TESTE",
}

insercao = requests.post(
    f"{url}/rest/v1/revisoes",
    headers={**headers, "Prefer": "return=representation"},
    json=registro,
    timeout=20,
)
insercao.raise_for_status()

leitura = requests.get(
    f"{url}/rest/v1/revisoes?caso_id=eq.{caso_id}&select=caso_id,decisao,revisor_nome",
    headers=headers,
    timeout=20,
)
leitura.raise_for_status()
if len(leitura.json()) != 1:
    raise RuntimeError("O registro de teste não foi encontrado após a inserção.")

exclusao = requests.delete(
    f"{url}/rest/v1/revisoes?caso_id=eq.{caso_id}",
    headers=headers,
    timeout=20,
)
exclusao.raise_for_status()

confirmacao = requests.get(
    f"{url}/rest/v1/revisoes?caso_id=eq.{caso_id}&select=caso_id",
    headers=headers,
    timeout=20,
)
confirmacao.raise_for_status()
if confirmacao.json():
    raise RuntimeError("O registro temporário não foi removido.")

print("Supabase validado: tabelas acessíveis, escrita confirmada e registro temporário removido.")
