from django.urls import path

from apps.ibge_processor.views import ApiIndexView, EstatisticasView, ProcessarCsvView

urlpatterns = [
    path("", ApiIndexView.as_view(), name="api-index"),
    path("processar-csv/", ProcessarCsvView.as_view(), name="processar-csv"),
    path("estatisticas/", EstatisticasView.as_view(), name="estatisticas"),
]
