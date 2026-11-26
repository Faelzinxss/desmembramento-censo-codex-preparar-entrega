"""Auditoria somente leitura para investigar repeticoes durante a operacao."""

from __future__ import annotations

import argparse
import csv
import json
import sys
import tomllib
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

RAIZ = Path(__file__).resolve().parents[1]
SECRETS = RAIZ / ".streamlit" / "secrets.toml"


def config_supabase() -> tuple[str, dict[str, str]]:
    config = tomllib.loads(SECRETS.read_text(encoding="utf-8"))["supabase"]
    url = str(config["url"]).rstrip("/")
    chave = str(config.get("secret_key") or config.get("service_role_key") or "")
    if not url or not chave:
        raise RuntimeError("Configuração privada do Supabase incompleta.")
    return url, {
        "apikey": chave,
        "Authorization": f"Bearer {chave}",
        "Content-Type": "application/json",
    }


def paginas(url: str, headers: dict, tabela: str, campos: str) -> list[dict]:
    resultado: list[dict] = []
    ultimo_id = 0
    while True:
        parametros = urlencode({
                "select": campos,
                "id": f"gt.{ultimo_id}",
                "order": "id.asc",
                "limit": "1000",
            })
        requisicao = Request(f"{url}/rest/v1/{tabela}?{parametros}", headers=headers)
        with urlopen(requisicao, timeout=60) as resposta:
            lote = json.loads(resposta.read().decode("utf-8"))
        if not lote:
            break
        resultado.extend(lote)
        ultimo_id = int(lote[-1]["id"])
    return resultado


def raiz(codigo: str | None) -> str:
    return str(codigo or "").split("-", 1)[0].strip().upper()


def dia(valor: str | None) -> str:
    return str(valor or "")[:10] or "sem_data"


def instante(valor: str | None) -> datetime | None:
    if not valor:
        return None
    return datetime.fromisoformat(str(valor).replace("Z", "+00:00"))


def exportar_linha_do_tempo(
    destino: Path,
    revisoes: list[dict],
    historico: list[dict],
) -> None:
    """Exporta evidências para revisão humana; nunca altera o Supabase."""
    atuais = {str(item["caso_id"]): item for item in revisoes}
    versoes: dict[str, list[dict]] = defaultdict(list)
    for item in historico:
        versoes[str(item["caso_id"])].append({**item, "tipo_versao": "historica"})
    for caso_id, item in atuais.items():
        if caso_id in versoes:
            versoes[caso_id].append({**item, "tipo_versao": "atual"})

    destino.parent.mkdir(parents=True, exist_ok=True)
    campos = [
        "caso_id", "ordem", "tipo_versao", "decisao", "observacao",
        "revisor_nome", "usuario_id", "revisado_em", "substituida_em",
        "substituida_por", "segundos_ate_substituicao", "troca_de_usuario",
        "substituicao_ate_5_min", "code_a", "code_b",
        "matricula_desmembrada", "novo_code_deep",
    ]
    with destino.open("w", newline="", encoding="utf-8-sig") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=campos, delimiter=";")
        escritor.writeheader()
        for caso_id in sorted(versoes):
            linha_tempo = sorted(
                versoes[caso_id],
                key=lambda item: (
                    instante(item.get("revisado_em")).timestamp()
                    if instante(item.get("revisado_em")) else float("-inf")
                ),
            )
            for ordem, item in enumerate(linha_tempo, start=1):
                anterior = instante(item.get("revisado_em"))
                substituida = instante(item.get("substituida_em"))
                segundos = (substituida - anterior).total_seconds() if anterior and substituida else None
                troca = bool(
                    item.get("usuario_id") and item.get("substituida_por")
                    and item["usuario_id"] != item["substituida_por"]
                )
                escritor.writerow({
                    "caso_id": caso_id,
                    "ordem": ordem,
                    "tipo_versao": item.get("tipo_versao"),
                    "decisao": item.get("decisao"),
                    "observacao": item.get("observacao"),
                    "revisor_nome": item.get("revisor_nome"),
                    "usuario_id": item.get("usuario_id"),
                    "revisado_em": item.get("revisado_em"),
                    "substituida_em": item.get("substituida_em"),
                    "substituida_por": item.get("substituida_por"),
                    "segundos_ate_substituicao": round(segundos, 3) if segundos is not None else "",
                    "troca_de_usuario": troca,
                    "substituicao_ate_5_min": segundos is not None and 0 <= segundos <= 300,
                    "code_a": item.get("code_a"),
                    "code_b": item.get("code_b"),
                    "matricula_desmembrada": item.get("matricula_desmembrada"),
                    "novo_code_deep": item.get("novo_code_deep"),
                })


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--exportar",
        type=Path,
        help="CSV opcional com a linha do tempo dos casos que possuem histórico.",
    )
    argumentos = parser.parse_args()
    url, headers = config_supabase()
    revisoes = paginas(
        url,
        headers,
        "revisoes",
        "id,caso_id,code_a,code_b,decisao,observacao,revisor_nome,usuario_id,"
        "revisado_em,matricula_desmembrada,novo_code_deep",
    )
    historico = paginas(
        url,
        headers,
        "revisoes_historico",
        "id,revisao_id,caso_id,code_a,code_b,decisao,observacao,revisor_nome,"
        "usuario_id,revisado_em,matricula_desmembrada,novo_code_deep,"
        "substituida_por,substituida_em",
    )

    casos_por_raiz: dict[str, set[str]] = defaultdict(set)
    for item in revisoes:
        for codigo in {raiz(item.get("code_a")), raiz(item.get("code_b"))}:
            if codigo:
                casos_por_raiz[codigo].add(str(item["caso_id"]))

    repetidas = {codigo: casos for codigo, casos in casos_por_raiz.items() if len(casos) > 1}
    versoes_por_caso = Counter(str(item["caso_id"]) for item in historico)
    autores_trocados = sum(
        1
        for item in historico
        if item.get("usuario_id") and item.get("substituida_por")
        and item["usuario_id"] != item["substituida_por"]
    )
    historico_por_dia = Counter(dia(item.get("substituida_em")) for item in historico)
    revisoes_por_dia = Counter(dia(item.get("revisado_em")) for item in revisoes)
    intervalos = []
    for item in historico:
        anterior = instante(item.get("revisado_em"))
        substituida = instante(item.get("substituida_em"))
        if anterior and substituida:
            intervalos.append((substituida - anterior).total_seconds())

    print(f"revisoes_atuais={len(revisoes)}")
    print(f"casos_unicos_em_revisoes={len({str(x['caso_id']) for x in revisoes})}")
    print(f"versoes_no_historico={len(historico)}")
    print(f"casos_com_historico={len(versoes_por_caso)}")
    print(f"historicos_com_troca_de_usuario={autores_trocados}")
    print(f"raizes_em_mais_de_um_caso_revisado={len(repetidas)}")
    print(f"maior_quantidade_de_casos_na_mesma_raiz={max(map(len, repetidas.values()), default=0)}")
    print("decisoes_atuais=" + ", ".join(
        f"{nome}:{quantidade}" for nome, quantidade in Counter(
            str(item.get("decisao") or "") for item in revisoes
        ).most_common()
    ))
    print("distribuicao_historico_por_caso=" + ", ".join(
        f"{quantidade}_versao(oes):{casos}" for quantidade, casos in sorted(
            Counter(versoes_por_caso.values()).items()
        )
    ))
    print("historico_criado_por_dia=" + ", ".join(
        f"{data}:{quantidade}" for data, quantidade in sorted(historico_por_dia.items())
    ))
    print("revisoes_atuais_por_dia=" + ", ".join(
        f"{data}:{quantidade}" for data, quantidade in sorted(revisoes_por_dia.items())
    ))
    print(f"substituicoes_em_ate_5_minutos={sum(0 <= x <= 300 for x in intervalos)}")
    print(f"substituicoes_em_ate_30_minutos={sum(0 <= x <= 1800 for x in intervalos)}")
    if argumentos.exportar:
        destino = argumentos.exportar.resolve()
        exportar_linha_do_tempo(destino, revisoes, historico)
        print(f"relatorio_csv={destino}")


if __name__ == "__main__":
    main()
