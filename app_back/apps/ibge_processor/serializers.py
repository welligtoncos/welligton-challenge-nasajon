from rest_framework import serializers


class UploadCsvSerializer(serializers.Serializer):
    """Upload multipart com o CSV de municípios."""

    arquivo = serializers.FileField(
        help_text="CSV com cabeçalho **municipio** e **populacao** (ordem livre).",
    )


class ErrorDetailSerializer(serializers.Serializer):
    """Resposta de erro padrão DRF (`detail`)."""

    detail = serializers.CharField()


class LinhaProcessadaSerializer(serializers.Serializer):
    """Uma linha do resultado (espelha `resultado.csv`)."""

    municipio_input = serializers.CharField()
    populacao_input = serializers.CharField()
    municipio_ibge = serializers.CharField()
    uf = serializers.CharField()
    regiao = serializers.CharField()
    id_ibge = serializers.IntegerField(allow_null=True)
    status = serializers.CharField(
        help_text="OK | NAO_ENCONTRADO | ERRO_API | AMBIGUO",
    )


class StatsSerializer(serializers.Serializer):
    """Estatísticas agregadas após o processamento."""

    total_municipios = serializers.IntegerField()
    total_ok = serializers.IntegerField()
    total_nao_encontrado = serializers.IntegerField(
        help_text="Contagem de linhas com status NAO_ENCONTRADO ou AMBIGUO. "
        "Soma com total_ok e total_erro_api igual a total_municipios.",
    )
    total_erro_api = serializers.IntegerField()
    pop_total_ok = serializers.IntegerField()
    medias_por_regiao = serializers.DictField(
        child=serializers.FloatField(),
        help_text="Média da população informada (linhas OK) por nome da região.",
    )


class ProcessarCsvResponseSerializer(serializers.Serializer):
    """Corpo JSON de sucesso de POST /api/processar-csv/."""

    linhas = LinhaProcessadaSerializer(many=True)
    stats = StatsSerializer()
    resultado_csv = serializers.CharField(
        help_text="Conteúdo completo do CSV de saída (mesmas colunas que `linhas`).",
    )


class ProcessarCsvLinkSerializer(serializers.Serializer):
    """Link para o endpoint de upload."""

    url = serializers.CharField()
    method = serializers.CharField()
    body = serializers.CharField()


class ApiIndexSerializer(serializers.Serializer):
    """Resposta de GET /api/."""

    processar_csv = ProcessarCsvLinkSerializer()
    estatisticas = ProcessarCsvLinkSerializer()


class LinhaParaEstatisticaSerializer(serializers.Serializer):
    """
    Registro processado mínimo para cálculo de estatísticas.
    Campos adicionais enviados pelo cliente são ignorados após a validação.
    """

    municipio_input = serializers.CharField(required=False, allow_blank=True, default="")
    populacao_input = serializers.CharField(required=False, allow_blank=True, default="")
    regiao = serializers.CharField(required=False, allow_blank=True, default="")
    status = serializers.CharField()


class EstatisticasRequestSerializer(serializers.Serializer):
    """Corpo JSON de POST /api/estatisticas/."""

    linhas = serializers.ListField(
        child=LinhaParaEstatisticaSerializer(),
        allow_empty=True,
        help_text="Lista de linhas já processadas (ex.: retorno de processar-csv, campo `linhas`).",
    )


class EstatisticasResponseSerializer(serializers.Serializer):
    """Envelope JSON esperado pelo dashboard: apenas `stats`."""

    stats = StatsSerializer()
