# Desafio Nasajon — IBGE

API **Django** (processamento CSV + IBGE) e **Angular** (login Supabase, planilha, download, correção).

**Requisitos:** Python 3.11+, Node 20+, internet (IBGE).

## Backend (`app_back/`)

```bash
cd app_back
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1  |  Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API: **http://127.0.0.1:8000** — Swagger: **/api/docs/** · ReDoc: **/api/redoc/** · Processar CSV: **POST /api/processar-csv/** (`multipart`, campo `arquivo`).

Testes: `python manage.py test apps.ibge_processor` · Smoke: `python scripts/smoke_test.py`

## Frontend (`app_front_challenge-nasajon/`)

```bash
cd app_front_challenge-nasajon
npm install
npm start
```

App: **http://localhost:4200** — Login → portal → CSV/XLSX (`municipio`, `populacao`) → processar → opcional “Enviar resultado para correção”.

Config: `src/app/config/api.config.ts` (`API_BASE_URL`, padrão `http://127.0.0.1:8000`) e `supabase.config.ts` (Supabase + URL da Edge Function). Em `ng serve`, `proxy.conf.json` encaminha `/api` para o Django.

Testes: `npm test` · Build: `npx ng build --configuration production`

## Rodar os dois

1. `runserver` no backend.  
2. `npm start` no front com `API_BASE_URL` apontando para a API.

**Produção:** defina `API_BASE_URL` e URLs Supabase no build; no Django (`DEBUG=False`) ajuste `CORS_ALLOWED_ORIGINS` para o domínio do front.
