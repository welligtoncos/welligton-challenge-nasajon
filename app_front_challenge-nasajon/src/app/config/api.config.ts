/**
 * Base URL da API Django.
 *
 * **Padrão:** URL direta do `runserver` — evita 404 quando o proxy do Vite não
 * encaminha (CORS já liberado em DEBUG no Django).
 *
 * Para usar só o proxy do `ng serve` (mesma origem, sem CORS), defina `''` e
 * reinicie o `ng serve` após alterar `proxy.conf.json` (formato em array).
 *
 * **Produção:** URL completa da API, ex. `https://api.seudominio.com`
 */
export const API_BASE_URL = 'http://127.0.0.1:8000';
