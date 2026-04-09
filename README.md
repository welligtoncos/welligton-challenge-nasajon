# Desafio Nasajon — IBGE (backend + frontend)

Monorepo com **API Django** para processar planilhas de municípios (CSV) com dados do IBGE e **aplicação Angular** para login (Supabase), prévia da planilha, download do resultado e envio opcional das estatísticas para a Edge Function de correção.

## Requisitos

| Ferramenta | Versão sugerida |
|------------|-----------------|
| Python     | 3.11+           |
| Node.js    | 20+ (LTS)       |
| npm        | vem com Node    |

É necessário acesso à internet para o backend consultar a API pública de municípios do IBGE.

---

## Backend (Django)

Pasta: `app_back/`

### 1. Ambiente virtual e dependências

No PowerShell ou terminal, a partir da raiz do repositório:

```bash
cd app_back
python -m venv .venv
```

Ativação:

- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
- **Windows (cmd):** `.venv\Scripts\activate.bat`
- **Linux/macOS:** `source .venv/bin/activate`

Instalar pacotes:

```bash
pip install -r requirements.txt
```

### 2. Banco de dados e superusuário (opcional)

```bash
python manage.py migrate
```

O projeto usa SQLite (`db.sqlite3` na pasta `app_back/`). O endpoint principal de processamento **não exige** tabelas próprias do app, mas o `migrate` evita avisos e habilita o admin se quiser usá-lo.

### 3. Subir o servidor

```bash
python manage.py runserver
```

Por padrão a API fica em **http://127.0.0.1:8000**.

### Documentação Swagger

Com o backend no ar, abra no navegador:

**http://127.0.0.1:8000/api/docs/**

Lá você vê todos os endpoints, modelos de request/response e pode **executar chamadas reais** sem Postman ou curl.

| Passo | O que fazer |
|-------|-------------|
| 1 | Abra a URL acima. Há **filtro** no topo para buscar por nome (ex.: `processar`). |
| 2 | Expanda **Processamento** → **POST /api/processar-csv/**. |
| 3 | Clique em **Try it out**. |
| 4 | Em **arquivo**, use **Choose File** e selecione um `.csv` com colunas `municipio` e `populacao`. |
| 5 | **Execute**. A resposta mostra `linhas`, `stats` e o texto de `resultado_csv`. A primeira requisição pode levar mais tempo (download da lista IBGE no servidor). |
| 6 | Para **POST /api/estatisticas/**, use **Try it out** e cole um JSON no formato `{ "linhas": [ ... ] }` (o mesmo array `linhas` devolvido pelo passo anterior). |

Alternativas:

- **ReDoc** (só leitura, layout diferente): http://127.0.0.1:8000/api/redoc/
- **Schema OpenAPI** (YAML/JSON para importar em outras ferramentas): http://127.0.0.1:8000/api/schema/
- **GET /** — JSON na raiz com links absolutos para Swagger e demais rotas.

### Endpoints úteis

| Método | Caminho | Descrição |
|--------|---------|-----------|
| GET | `/` | JSON raiz com links (inclui URLs completas da documentação) |
| GET | `/api/` | Índice dos endpoints da API |
| POST | `/api/processar-csv/` | `multipart/form-data`, campo **`arquivo`** (CSV com colunas `municipio` e `populacao`) |
| POST | `/api/estatisticas/` | JSON `{ "linhas": [ ... ] }` (mesmo formato das linhas retornadas pelo processamento) |
| GET | `/api/docs/` | **Swagger UI** (testar a API no navegador) |
| GET | `/api/schema/` | OpenAPI schema |

Variável relevante em `config/settings.py`: `IBGE_MUNICIPIOS_URL` (URL da lista de municípios do IBGE).

Em **DEBUG**, CORS está liberado para qualquer origem, o que facilita o Angular em `localhost:4200` chamando `http://127.0.0.1:8000` diretamente.

### Teste rápido (linha de comando)

Com o servidor parado ou em outro terminal (com venv ativo e dependências):

```bash
cd app_back
python scripts/smoke_test.py
```

Usa `sample_input.csv`, rede para o IBGE e imprime estatísticas no console.

---

## Frontend (Angular)

Pasta: `app_front_challenge-nasajon/`

### 1. Instalar dependências

```bash
cd app_front_challenge-nasajon
npm install
```

### 2. Configuração

Edite conforme seu ambiente:

| Arquivo | Uso |
|---------|-----|
| `src/app/config/api.config.ts` | **`API_BASE_URL`**: URL base da API Django. Padrão `http://127.0.0.1:8000`. Use `''` se for usar só o proxy (requisições relativas a `/api/...`). |
| `src/app/config/supabase.config.ts` | URL do projeto, **anon key**, e opcionalmente **`IBGE_SUBMIT_FUNCTION_URL`** da Edge Function de correção. |
| `proxy.conf.json` | Redireciona `/api` para `http://127.0.0.1:8000` durante o `ng serve`. |

### 3. Subir a aplicação

```bash
npm start
```

Ou:

```bash
npx ng serve
```

Abra **http://localhost:4200**. O fluxo padrão é:

1. **Login** — autenticação via Supabase (e-mail/senha); o token fica no `localStorage`.
2. **Portal** — envio de CSV ou XLSX, prévia, botão para processar no servidor e baixar `resultado.csv`.
3. Após o processamento, use **“Enviar resultado para correção”** para POST das `stats` na Edge Function (com `Authorization: Bearer` do usuário logado). A nota e o feedback aparecem na tela e no console do navegador.

### Testes unitários

```bash
npm test
```

---

## Uso conjunto (desenvolvimento)

1. Terminal 1 — backend: `cd app_back`, ative o venv, `python manage.py runserver`.
2. Terminal 2 — frontend: `cd app_front_challenge-nasajon`, `npm start`.
3. Garanta que `API_BASE_URL` aponte para o mesmo host/porta do Django (padrão `http://127.0.0.1:8000`).
4. Acesse o front, faça login e envie uma planilha com colunas **`municipio`** e **`populacao`**.

### Formato da planilha

- **CSV:** cabeçalho com `municipio` e `populacao` (maiúsculas/minúsculas ignoradas no nome da coluna).
- **XLSX:** mesma ideia; o front converte para CSV ao chamar a API se necessário.

---

## Build de produção (frontend)

```bash
cd app_front_challenge-nasajon
npx ng build --configuration production
```

Saída em `dist/app_front_challenge-nasajon/`. Ajuste `API_BASE_URL` e as URLs do Supabase para os ambientes reais.

---

## Estrutura resumida

```
app_back/                 # Django + DRF (ibge_processor)
app_front_challenge-nasajon/   # Angular 19
```

Em dúvida sobre o contrato JSON, use o **Swagger** com o backend em execução: **http://127.0.0.1:8000/api/docs/** (passo a passo na seção **Documentação Swagger** acima).
