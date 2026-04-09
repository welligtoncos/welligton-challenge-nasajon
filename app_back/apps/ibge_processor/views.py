"""Endpoint REST para processar CSV com enriquecimento via IBGE."""
from __future__ import annotations

import logging

from drf_spectacular.utils import extend_schema
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ibge_processor.serializers import (
    ApiIndexSerializer,
    ErrorDetailSerializer,
    EstatisticasRequestSerializer,
    EstatisticasResponseSerializer,
    ProcessarCsvResponseSerializer,
    UploadCsvSerializer,
)
from apps.ibge_processor.services.csv_service import (
    CsvValidationError,
    ler_e_validar,
    montar_csv_resultado,
)
from apps.ibge_processor.services.ibge_service import IbgeApiError, buscar_municipios
from apps.ibge_processor.services.matching_service import processar_linhas
from apps.ibge_processor.services.stats_service import calcular_estatisticas

logger = logging.getLogger(__name__)


@extend_schema(
    summary="Índice da API",
    description="Lista o endpoint principal de processamento e URL absoluta.",
    tags=["Metadados"],
    responses={200: ApiIndexSerializer},
)
class ApiIndexView(APIView):
    """GET /api/ — índice dos endpoints do app."""

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "processar_csv": {
                    "url": request.build_absolute_uri("processar-csv/"),
                    "method": "POST",
                    "body": "multipart/form-data, campo `arquivo` (CSV)",
                },
                "estatisticas": {
                    "url": request.build_absolute_uri("estatisticas/"),
                    "method": "POST",
                    "body": 'application/json, campo `linhas` (array de objetos com status, populacao_input, regiao, …)',
                },
            }
        )


@extend_schema(
    summary="Processar CSV (IBGE)",
    description=(
        "Recebe um arquivo CSV, valida colunas **municipio** e **populacao**, "
        "consulta a API pública de municípios do IBGE, faz matching (normalização + fuzzy) "
        "e devolve linhas enriquecidas, estatísticas e o texto **resultado_csv** pronto para download."
    ),
    tags=["Processamento"],
    request=UploadCsvSerializer,
    responses={
        200: ProcessarCsvResponseSerializer,
        400: ErrorDetailSerializer,
        502: ErrorDetailSerializer,
    },
)
class ProcessarCsvView(APIView):
    """
    POST /api/processar-csv/

    Form-data ou multipart: campo ``arquivo`` (CSV).
    """

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        serializer = UploadCsvSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data["arquivo"]

        try:
            linhas_csv = ler_e_validar(upload)
        except CsvValidationError as exc:
            return Response({"detail": str(exc)}, status=400)

        try:
            municipios = buscar_municipios()
        except IbgeApiError as exc:
            logger.warning("IBGE indisponível: %s", exc)
            return Response({"detail": str(exc)}, status=502)

        linhas = processar_linhas(linhas_csv, municipios)
        stats = calcular_estatisticas(linhas)
        resultado_csv = montar_csv_resultado(linhas)

        return Response(
            {
                "linhas": linhas,
                "stats": stats,
                "resultado_csv": resultado_csv,
            },
            status=200,
        )


@extend_schema(
    summary="Calcular estatísticas",
    description=(
        "Recebe a lista **linhas** já processada (mesmo formato do retorno de `processar-csv`) "
        "e devolve apenas `{ \"stats\": { ... } }` para alimentar cards e resumo do dashboard. "
        "Reutiliza o serviço `calcular_estatisticas` (totais por status, população somada nos OK, médias por região)."
    ),
    tags=["Estatísticas"],
    request=EstatisticasRequestSerializer,
    responses={200: EstatisticasResponseSerializer, 400: ErrorDetailSerializer},
)
class EstatisticasView(APIView):
    """
    POST /api/estatisticas/

    Corpo JSON: ``{ "linhas": [ { "municipio_input", "populacao_input", "regiao", "status", ... }, ... ] }``
    """

    parser_classes = (JSONParser,)

    def post(self, request, *args, **kwargs):
        serializer = EstatisticasRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        linhas = [dict(item) for item in serializer.validated_data["linhas"]]
        stats = calcular_estatisticas(linhas)
        return Response({"stats": stats}, status=200)
