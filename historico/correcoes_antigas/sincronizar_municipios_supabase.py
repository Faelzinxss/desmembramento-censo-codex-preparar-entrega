from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sincronizar_supabase_web import (
    LIMITE_DESATIVACAO_MASSIVA,
    atualizar_opcoes_filtros,
    config_supabase,
    desativar_ausentes,
    enviar_lotes,
    ler_base,
    ler_estado_remoto,
    sessao_http,
)


def sincronizar(enviar: bool, permitir_desativacao_massiva: bool = False) -> None:
    matriculas, casos, _ = ler_base()
    matriculas_locais = {item["code"]: item for item in matriculas}
    casos_locais = {item["caso_id"]: item for item in casos}

    url, headers = config_supabase()
    sessao = sessao_http()
    print("Comparando somente municípios com o Supabase...", flush=True)
    matriculas_remotas = ler_estado_remoto(
        sessao, url, headers, "matriculas", "code", campos_extras=("municipio",)
    )
    casos_remotos = ler_estado_remoto(
        sessao, url, headers, "casos", "caso_id", incluir_ativo=True,
        campos_extras=("municipio_a", "municipio_b"),
    )

    matriculas_novas = [
        item for codigo, item in matriculas_locais.items() if codigo not in matriculas_remotas
    ]
    matriculas_corrigidas = [
        item
        for codigo, item in matriculas_locais.items()
        if codigo in matriculas_remotas
        and matriculas_remotas[codigo].get("municipio") != item.get("municipio")
    ]
    casos_novos = [
        item for caso_id, item in casos_locais.items() if caso_id not in casos_remotos
    ]
    casos_corrigidos = [
        item
        for caso_id, item in casos_locais.items()
        if caso_id in casos_remotos and (
            casos_remotos[caso_id].get("municipio_a") != item.get("municipio_a")
            or casos_remotos[caso_id].get("municipio_b") != item.get("municipio_b")
            or casos_remotos[caso_id].get("ativo") is False
        )
    ]
    ausentes = sorted(set(casos_remotos) - set(casos_locais))
    ativos_remotos = sum(1 for item in casos_remotos.values() if item.get("ativo"))
    ausentes_ativos = [caso_id for caso_id in ausentes if casos_remotos[caso_id].get("ativo")]
    percentual_ausente = len(ausentes_ativos) / max(ativos_remotos, 1)

    print(f"Matrículas novas: {len(matriculas_novas):,}")
    print(f"Municípios de matrículas a corrigir: {len(matriculas_corrigidas):,}")
    print(f"Casos novos: {len(casos_novos):,}")
    print(f"Municípios de casos a corrigir/reativar: {len(casos_corrigidos):,}")
    print(f"Casos antigos a desativar: {len(ausentes_ativos):,}")

    if percentual_ausente > LIMITE_DESATIVACAO_MASSIVA and not permitir_desativacao_massiva:
        raise RuntimeError(
            f"Proteção acionada: seriam desativados {percentual_ausente:.1%} dos casos ativos."
        )
    if not enviar:
        print("Simulação concluída. Nenhum registro foi alterado.")
        return

    enviar_lotes(sessao, url, headers, "matriculas", matriculas_novas, "code")
    enviar_lotes(sessao, url, headers, "matriculas", matriculas_corrigidas, "code")
    enviar_lotes(sessao, url, headers, "casos", casos_novos, "caso_id")
    enviar_lotes(sessao, url, headers, "casos", casos_corrigidos, "caso_id")
    desativar_ausentes(sessao, url, headers, ausentes_ativos)
    atualizar_opcoes_filtros(sessao, url, headers)
    print("Municípios sincronizados e filtros atualizados.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sincroniza somente municípios e registros novos.")
    parser.add_argument("--enviar", action="store_true")
    parser.add_argument("--permitir-desativacao-massiva", action="store_true")
    argumentos = parser.parse_args()
    sincronizar(argumentos.enviar, argumentos.permitir_desativacao_massiva)
