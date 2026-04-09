"""Teste rápido local (requer rede para o IBGE)."""
import io
import os
import sys
from pathlib import Path

import django

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.ibge_processor.services.csv_service import ler_e_validar  # noqa: E402
from apps.ibge_processor.services.ibge_service import buscar_municipios  # noqa: E402
from apps.ibge_processor.services.matching_service import processar_linhas  # noqa: E402
from apps.ibge_processor.services.stats_service import calcular_estatisticas  # noqa: E402


def main() -> None:
    csv_path = BASE / "sample_input.csv"
    data = csv_path.read_bytes()
    linhas = ler_e_validar(io.BytesIO(data))
    municipios = buscar_municipios()
    out = processar_linhas(linhas, municipios)
    stats = calcular_estatisticas(out)
    print("stats:", stats)
    for row in out:
        print(row["municipio_input"], "->", row["status"], row.get("municipio_ibge"))


if __name__ == "__main__":
    main()
