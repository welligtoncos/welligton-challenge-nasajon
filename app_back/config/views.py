"""Views mínimas da raiz do projeto (fora do app ibge_processor)."""

from django.http import JsonResponse


def root(request):
    """GET / — evita 404 na raiz e lista os caminhos úteis."""
    base = request.build_absolute_uri("/").rstrip("/")
    return JsonResponse(
        {
            "service": "IBGE processor API",
            "mensagem_dev": (
                "Abra o Swagger UI para testar a API sem Postman: "
                "escolha um endpoint, clique em «Try it out», preencha e «Execute»."
            ),
            "documentacao_interativa": {
                "swagger_ui": {
                    "descricao": "Testar POST/GET no navegador (recomendado)",
                    "url": f"{base}/api/docs/",
                },
                "redoc": {
                    "descricao": "Documentação somente leitura",
                    "url": f"{base}/api/redoc/",
                },
                "open_api_schema": f"{base}/api/schema/",
            },
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
