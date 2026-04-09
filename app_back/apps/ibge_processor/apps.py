from django.apps import AppConfig


class IbgeProcessorConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ibge_processor"
    label = "ibge_processor"
    verbose_name = "Processador IBGE"
