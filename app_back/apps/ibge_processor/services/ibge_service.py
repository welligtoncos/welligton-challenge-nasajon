"""Consumo da API pública de municípios do IBGE."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class IbgeApiError(Exception):
    """Falha ao obter ou interpretar dados do IBGE."""


@dataclass(frozen=True, slots=True)
class MunicipioRecord:
    id: int
    nome: str
    nome_normalizado: str
    uf: str
    regiao: str


def _extrair_uf_regiao(raw: dict[str, Any]) -> tuple[str, str]:
    """Extrai sigla da UF e nome da região a partir do JSON do IBGE."""
    uf_sigla = ""
    regiao_nome = ""

    micro = raw.get("microrregiao")
    if isinstance(micro, dict):
        meso = micro.get("mesorregiao")
        if isinstance(meso, dict):
            uf = meso.get("UF")
            if isinstance(uf, dict):
                uf_sigla = str(uf.get("sigla") or "")
                reg = uf.get("regiao")
                if isinstance(reg, dict):
                    regiao_nome = str(reg.get("nome") or "")

    if not uf_sigla:
        ri = raw.get("regiao-imediata")
        if isinstance(ri, dict):
            rint = ri.get("regiao-intermediaria")
            if isinstance(rint, dict):
                uf = rint.get("UF")
                if isinstance(uf, dict):
                    uf_sigla = str(uf.get("sigla") or "")
                    reg = uf.get("regiao")
                    if isinstance(reg, dict):
                        regiao_nome = str(reg.get("nome") or "")

    return uf_sigla, regiao_nome


def _parse_item(item: dict[str, Any], nome_norm_fn) -> MunicipioRecord | None:
    try:
        mid = int(item["id"])
    except (KeyError, TypeError, ValueError):
        return None
    nome = str(item.get("nome") or "").strip()
    if not nome:
        return None
    uf, regiao = _extrair_uf_regiao(item)
    return MunicipioRecord(
        id=mid,
        nome=nome,
        nome_normalizado=nome_norm_fn(nome),
        uf=uf,
        regiao=regiao,
    )


def buscar_municipios(timeout: int = 120) -> list[MunicipioRecord]:
    """
    Baixa a lista completa de municípios e normaliza para matching.
    """
    from apps.ibge_processor.utils.text_normalizer import normalize

    url = getattr(settings, "IBGE_MUNICIPIOS_URL", None) or (
        "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
    )
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.exception("Falha na requisição ao IBGE")
        raise IbgeApiError("Não foi possível consultar a API do IBGE.") from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise IbgeApiError("Resposta do IBGE não é JSON válido.") from exc

    if not isinstance(data, list):
        raise IbgeApiError("Formato inesperado da API do IBGE (esperado lista).")

    registros: list[MunicipioRecord] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        rec = _parse_item(item, normalize)
        if rec is not None:
            registros.append(rec)

    if not registros:
        raise IbgeApiError("Lista de municípios do IBGE veio vazia.")

    return registros
