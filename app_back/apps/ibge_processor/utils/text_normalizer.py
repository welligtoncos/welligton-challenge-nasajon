"""Normalização de texto para comparação de nomes de municípios."""
from __future__ import annotations

import re
import unicodedata


def strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def normalize(text: str) -> str:
    """
    Remove acentos, caixa baixa, espaços extras.
    Usado como chave de comparação e para fuzzy matching.
    """
    if text is None:
        return ""
    t = strip_accents(str(text).strip())
    t = t.lower()
    t = re.sub(r"\s+", " ", t)
    return t.strip()
