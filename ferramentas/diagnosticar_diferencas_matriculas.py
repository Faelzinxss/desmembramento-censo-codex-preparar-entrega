from __future__ import annotations

from collections import Counter

import requests

from sincronizar_supabase_web import config_supabase, ler_base, somente_alterados


CAMPOS = (
    "foto", "origem_foto", "backoffice", "agente", "data_registro",
    "endereco", "municipio", "situacao_backoffice",
)
TAMANHO_AMOSTRA = 500
TAMANHO_LOTE = 100


def equivalente(valor):
    return None if valor in (None, "") else valor


matriculas, _, _ = ler_base()
amostra = sorted(matriculas, key=lambda item: item["code"])[:TAMANHO_AMOSTRA]
url, headers = config_supabase()
remotas = {}

with requests.Session() as sessao:
    for inicio in range(0, len(amostra), TAMANHO_LOTE):
        lote = amostra[inicio : inicio + TAMANHO_LOTE]
        codigos = ",".join(item["code"] for item in lote)
        resposta = sessao.get(
            f"{url}/rest/v1/matriculas",
            params={
                "select": "code,conteudo_hash," + ",".join(CAMPOS),
                "code": f"in.({codigos})",
            },
            headers=headers,
            timeout=90,
        )
        resposta.raise_for_status()
        remotas.update({item["code"]: item for item in resposta.json()})

diferencas = Counter()
exemplos = {}
novas = 0
for local in amostra:
    remota = remotas.get(local["code"])
    if not remota:
        novas += 1
        continue
    for campo in CAMPOS:
        antes, depois = equivalente(remota.get(campo)), equivalente(local.get(campo))
        if antes != depois:
            diferencas[campo] += 1
            exemplos.setdefault(campo, (local["code"], antes, depois))

print(f"Amostra: {len(amostra):,}; novas: {novas:,}")
detectadas = somente_alterados(
    amostra, remotas, "code",
    campos_comparar=("situacao_backoffice",),
    aceitar_hashes_legados_matricula=True,
)
print(f"Alterações reais detectadas pelo sincronizador: {len(detectadas):,}")
for campo, quantidade in diferencas.most_common():
    codigo, antes, depois = exemplos[campo]
    print(f"{campo}: {quantidade:,} diferenças")
    print(f"  Exemplo {codigo}: Supabase={antes!r} | nova base={depois!r}")
