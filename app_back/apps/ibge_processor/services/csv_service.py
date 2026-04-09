"""Leitura, validação do CSV de entrada e geração do resultado.csv em memória."""
from __future__ import annotations

import csv
import io
from typing import Any

REQUIRED_COLUMNS = frozenset({"municipio", "populacao"})

RESULTADO_FIELDNAMES = [
    "municipio_input",
    "populacao_input",
    "municipio_ibge",
    "uf",
    "regiao",
    "id_ibge",
    "status",
]


class CsvValidationError(ValueError):
    """CSV inválido (cabeçalho, colunas ou conteúdo)."""


def _normalize_header(name: str) -> str:
    return (name or "").strip().lower()


def ler_e_validar(arquivo) -> list[dict[str, str]]:
    """
    Lê o arquivo enviado (UploadedFile ou bytes wrapper).
    Exige exatamente as colunas municipio e populacao (ordem livre, case do cabeçalho ignorado).
    """
    raw = arquivo.read()
    if not raw:
        raise CsvValidationError("Arquivo vazio.")

    if isinstance(raw, bytes):
        text = raw.decode("utf-8-sig")
    else:
        text = str(raw)

    buffer = io.StringIO(text)
    reader = csv.DictReader(buffer)

    if not reader.fieldnames:
        raise CsvValidationError("Cabeçalho ausente ou ilegível.")

    norm_to_original: dict[str, str] = {}
    for fn in reader.fieldnames:
        if fn is None:
            continue
        key = _normalize_header(fn)
        if not key:
            continue
        if key in norm_to_original:
            raise CsvValidationError(f"Cabeçalho duplicado: {key!r}.")
        norm_to_original[key] = fn

    if set(norm_to_original.keys()) != REQUIRED_COLUMNS:
        raise CsvValidationError(
            "O CSV deve conter exatamente as colunas municipio e populacao. "
            f"Encontrado: {sorted(norm_to_original.keys())}."
        )

    col_mun = norm_to_original["municipio"]
    col_pop = norm_to_original["populacao"]

    linhas: list[dict[str, str]] = []
    for row in reader:
        if row is None:
            continue
        municipio = (row.get(col_mun) or "").strip()
        populacao = (row.get(col_pop) or "").strip()
        if not municipio and not populacao:
            continue
        linhas.append({"municipio": municipio, "populacao": populacao})

    if not linhas:
        raise CsvValidationError("Nenhuma linha de dados após o cabeçalho.")

    return linhas


def montar_csv_resultado(linhas: list[dict[str, Any]]) -> str:
    """Serializa as linhas processadas no formato resultado.csv."""
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=RESULTADO_FIELDNAMES, extrasaction="ignore")
    writer.writeheader()
    for item in linhas:
        row = {k: item.get(k, "") for k in RESULTADO_FIELDNAMES}
        if item.get("id_ibge") is not None and item.get("id_ibge") != "":
            row["id_ibge"] = str(item["id_ibge"])
        writer.writerow(row)
    return out.getvalue()
