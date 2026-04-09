"""Estatísticas agregadas após o matching.

Reutilizado por:
- ``ProcessarCsvView`` (resposta completa com ``linhas`` + ``stats``);
- ``EstatisticasView`` (POST ``/api/estatisticas/``, retorno só ``{ "stats": ... }``).
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from apps.ibge_processor.services.matching_service import (
    STATUS_OK,
    STATUS_ERRO_API,
    STATUS_NAO_ENCONTRADO,
)


def _parse_populacao(valor: str) -> int | None:
    if valor is None:
        return None
    s = str(valor).strip().replace(".", "").replace(",", ".")
    try:
        n = float(s)
    except ValueError:
        return None
    if not n == n:  # NaN
        return None
    return int(round(n))


def calcular_estatisticas(linhas: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(linhas)
    total_ok = sum(1 for r in linhas if r.get("status") == STATUS_OK)
    total_nao = sum(1 for r in linhas if r.get("status") == STATUS_NAO_ENCONTRADO)
    total_erro_api = sum(1 for r in linhas if r.get("status") == STATUS_ERRO_API)
    # Ambíguos entram em "outros" para totais explícitos; usuário pediu os quatro status.
    # total_municipios = todas as linhas processadas
    pop_total_ok = 0
    somas_regiao: dict[str, list[int]] = defaultdict(list)

    for r in linhas:
        if r.get("status") != STATUS_OK:
            continue
        p = _parse_populacao(str(r.get("populacao_input", "")))
        if p is not None:
            pop_total_ok += p
        regiao = (r.get("regiao") or "").strip() or "—"
        if p is not None:
            somas_regiao[regiao].append(p)

    medias_por_regiao: dict[str, float] = {}
    for reg, vals in somas_regiao.items():
        if vals:
            medias_por_regiao[reg] = round(sum(vals) / len(vals), 2)

    return {
        "total_municipios": total,
        "total_ok": total_ok,
        "total_nao_encontrado": total_nao,
        "total_erro_api": total_erro_api,
        "pop_total_ok": pop_total_ok,
        "medias_por_regiao": medias_por_regiao,
    }
