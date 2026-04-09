"""Estatísticas agregadas após o matching.

Reutilizado por:
- ``ProcessarCsvView`` (resposta completa com ``linhas`` + ``stats``);
- ``EstatisticasView`` (POST ``/api/estatisticas/``, retorno só ``{ "stats": ... }``).

Regras (desafio):
- ``total_municipios``: quantidade de linhas processadas.
- ``total_ok`` / ``total_nao_encontrado`` / ``total_erro_api``: contagens por ``status``.
- ``total_nao_encontrado`` inclui ``NAO_ENCONTRADO`` e ``AMBIGUO`` (município não resolvido).
- ``pop_total_ok``: soma dos valores numéricos de ``populacao_input`` nas linhas ``OK``
  (mesma lógica de parsing que o preview no front).
- ``medias_por_regiao``: média de ``populacao_input`` por nome de ``regiao``, só linhas ``OK``
  com população válida; médias com 2 casas decimais (meio acima, como em ``Math.round`` JS).
"""
from __future__ import annotations

import math
import re
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from apps.ibge_processor.services.matching_service import (
    STATUS_AMBIGUO,
    STATUS_ERRO_API,
    STATUS_NAO_ENCONTRADO,
    STATUS_OK,
)


def _parse_populacao_input(valor: str | None) -> int | None:
    """
    Converte ``populacao_input`` em inteiro não negativo, espelhando o comportamento do
    ``parsePopulacao`` do Angular (milhar com ponto, decimal com vírgula, Excel).
    """
    if valor is None:
        return None
    s = (
        str(valor)
        .strip()
        .replace(" ", "")
        .replace("\u00a0", "")
        .replace("\t", "")
    )
    if not s:
        return None

    if re.fullmatch(r"\d+", s):
        n = int(s)
        return n if n >= 0 else None

    comma = s.find(",")
    dot = s.find(".")

    if comma >= 0 and dot >= 0:
        if comma > dot:
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif comma >= 0:
        parts = s.split(",")
        if len(parts) == 2 and parts[1] and len(parts[1]) <= 2:
            s = f"{parts[0].replace('.', '')}.{parts[1]}"
        else:
            s = s.replace(",", "")
    elif dot >= 0:
        parts = s.split(".")
        last = parts[-1] if parts else ""
        if len(parts) > 2 or (len(parts) == 2 and len(last) == 3):
            s = "".join(parts)

    try:
        n = float(s)
    except ValueError:
        return None
    if not n == n or n < 0:  # NaN
        return None
    # Equivalente a Math.round em JS para números não negativos
    return int(math.floor(n + 0.5))


def _media_duas_casas(valores: list[int]) -> float:
    if not valores:
        raise ValueError("lista vazia")
    media = Decimal(sum(valores)) / Decimal(len(valores))
    return float(media.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calcular_estatisticas(linhas: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(linhas)
    total_ok = sum(1 for r in linhas if r.get("status") == STATUS_OK)
    total_erro_api = sum(1 for r in linhas if r.get("status") == STATUS_ERRO_API)
    total_nao_encontrado = sum(
        1
        for r in linhas
        if r.get("status") in (STATUS_NAO_ENCONTRADO, STATUS_AMBIGUO)
    )

    pop_total_ok = 0
    por_regiao: dict[str, list[int]] = defaultdict(list)

    for r in linhas:
        if r.get("status") != STATUS_OK:
            continue
        p = _parse_populacao_input(str(r.get("populacao_input", "")))
        if p is not None:
            pop_total_ok += p
            regiao = (r.get("regiao") or "").strip() or "—"
            por_regiao[regiao].append(p)

    medias_por_regiao: dict[str, float] = {}
    for regiao, vals in por_regiao.items():
        if vals:
            medias_por_regiao[regiao] = _media_duas_casas(vals)

    return {
        "total_municipios": total,
        "total_ok": total_ok,
        "total_nao_encontrado": total_nao_encontrado,
        "total_erro_api": total_erro_api,
        "pop_total_ok": pop_total_ok,
        "medias_por_regiao": medias_por_regiao,
    }
