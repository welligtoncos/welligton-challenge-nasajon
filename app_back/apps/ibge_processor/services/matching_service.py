"""Matching entre nomes do CSV e cadastro IBGE (normalização + fuzzy)."""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

from rapidfuzz import fuzz, process

from apps.ibge_processor.services.ibge_service import MunicipioRecord
from apps.ibge_processor.utils.text_normalizer import normalize

logger = logging.getLogger(__name__)

STATUS_OK = "OK"
STATUS_NAO_ENCONTRADO = "NAO_ENCONTRADO"
STATUS_ERRO_API = "ERRO_API"
STATUS_AMBIGUO = "AMBIGUO"

# Limiares empíricos para typos (ex.: Belo Horzionte, Curitba, Santoo Andre)
_SCORE_MIN_OK = 86
_SCORE_MIN_AMBIGUO = 78
_SCORE_GAP = 5


def _de_record(rec: MunicipioRecord) -> dict[str, Any]:
    return {
        "municipio_ibge": rec.nome,
        "uf": rec.uf,
        "regiao": rec.regiao,
        "id_ibge": rec.id,
    }


def processar_linhas(
    linhas_csv: list[dict[str, str]],
    municipios: list[MunicipioRecord],
) -> list[dict[str, Any]]:
    """
    Para cada linha do CSV, tenta associar a um município IBGE.
    """
    by_norm: dict[str, list[MunicipioRecord]] = defaultdict(list)
    for m in municipios:
        by_norm[m.nome_normalizado].append(m)

    resultados: list[dict[str, Any]] = []

    for row in linhas_csv:
        municipio_in = row.get("municipio", "")
        populacao_in = row.get("populacao", "")

        base = {
            "municipio_input": municipio_in,
            "populacao_input": populacao_in,
            "municipio_ibge": "",
            "uf": "",
            "regiao": "",
            "id_ibge": None,
            "status": STATUS_NAO_ENCONTRADO,
        }

        try:
            if not municipio_in.strip():
                base["status"] = STATUS_NAO_ENCONTRADO
                resultados.append(base)
                continue

            n = normalize(municipio_in)
            if not n:
                resultados.append(base)
                continue

            candidatos_exatos = by_norm.get(n, [])

            if len(candidatos_exatos) == 1:
                base.update(_de_record(candidatos_exatos[0]))
                base["status"] = STATUS_OK
                resultados.append(base)
                continue

            if len(candidatos_exatos) > 1:
                base["status"] = STATUS_AMBIGUO
                resultados.append(base)
                continue

            norm_list = [m.nome_normalizado for m in municipios]
            matches = process.extract(
                n,
                norm_list,
                scorer=fuzz.token_sort_ratio,
                limit=5,
            )

            if not matches:
                resultados.append(base)
                continue

            _best_name, best_score, best_idx = matches[0]
            best_rec = municipios[best_idx]
            second_score = float(matches[1][1]) if len(matches) > 1 else 0.0

            if best_score < _SCORE_MIN_AMBIGUO:
                resultados.append(base)
                continue

            if best_score < _SCORE_MIN_OK:
                if second_score >= best_score - _SCORE_GAP:
                    base["status"] = STATUS_AMBIGUO
                else:
                    base["status"] = STATUS_NAO_ENCONTRADO
                resultados.append(base)
                continue

            if second_score >= best_score - _SCORE_GAP:
                base["status"] = STATUS_AMBIGUO
                resultados.append(base)
                continue

            base.update(_de_record(best_rec))
            base["status"] = STATUS_OK
            resultados.append(base)

        except Exception:
            logger.exception("Erro ao processar linha do CSV")
            base["status"] = STATUS_ERRO_API
            resultados.append(base)

    return resultados
