"""Views mínimas da raiz do projeto (fora do app ibge_processor)."""

from django.http import JsonResponse


def root(request):
    """GET / — evita 404 na raiz e lista os caminhos úteis."""
    return JsonResponse(
        {
            "service": "IBGE processor API",
            "endpoints": {
                "api": "/api/",
                "swagger_ui": "/api/docs/",
                "redoc": "/api/redoc/",
                "open_api_schema": "/api/schema/",
                "processar_csv": {
                    "url": "/api/processar-csv/",
                    "method": "POST",
                    "body": "multipart/form-data, campo `arquivo` (CSV)",
                },
                "estatisticas": {
                    "url": "/api/estatisticas/",
                    "method": "POST",
                    "body": 'application/json, campo `linhas` (array)',
                },
                "admin": "/admin/",
            },
        },
        json_dumps_params={"ensure_ascii": False, "indent": 2},
    )
