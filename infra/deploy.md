# Deploying TrustLayer

This project has two deploy targets:

- **Frontend** → Cloudflare Pages (static site from `frontend/dist`)
- **Backend** → Yandex Cloud Function + Yandex API Gateway

You do not need a backend to see the UI; the frontend can be built and
deployed independently. When `VITE_API_BASE` is not set at build time, the
frontend will call `/api/*`, which only resolves in dev via Vite's proxy.
For production you MUST set `VITE_API_BASE` to your API Gateway URL.

---

## 1. Backend — Yandex Cloud Function

### Prereqs

- Yandex Cloud account, a folder, and the `yc` CLI configured:
  <https://yandex.cloud/en/docs/cli/quickstart>
- A **service account** with the `functions.functionInvoker` role (used by
  API Gateway to invoke the function).
- A **YandexGPT API key** and model URI. See:
  <https://yandex.cloud/en/docs/foundation-models/quickstart/yandexgpt>

### Build the deployment package

```bash
cd backend
npm ci
npm run package   # produces backend/package.zip
```

`package` script compiles TypeScript → `dist/` and zips it together with
`node_modules`. There are no runtime deps today, so the zip is tiny.

### Create / update the function

```bash
# First time
yc serverless function create --name trustlayer

# Deploy a new version
yc serverless function version create \
  --function-name trustlayer \
  --runtime nodejs18 \
  --entrypoint dist/handler.handler \
  --memory 256m \
  --execution-timeout 30s \
  --source-path backend/package.zip \
  --environment AI_MODE=yandex \
  --environment YANDEX_API_KEY=<your-key> \
  --environment YANDEX_GPT_MODEL=gpt://<folder_id>/yandexgpt/latest \
  --environment STORAGE_BACKEND=memory \
  --environment CORS_ORIGIN=https://<your-pages-domain>
```

Notes:

- `entrypoint` is `<file>.<export>` — our entry exports `handler` from
  `dist/handler.js`.
- `memory=256m` is plenty for mock mode; bump to 512m if you see cold-start
  latency with YandexGPT.
- The **in-memory storage** resets on cold starts. For persistent history,
  swap `backend/src/storage/memory.ts` for a YDB or Object Storage adapter.

### Create the API Gateway

Edit `infra/api-gateway.yaml` and fill in:

- `<FUNCTION_ID>` — `yc serverless function get trustlayer --format json | jq -r .id`
- `<SERVICE_ACCOUNT_ID>` — service account that can invoke the function.

Then:

```bash
yc serverless api-gateway create \
  --name trustlayer \
  --spec=infra/api-gateway.yaml
```

Grab the gateway domain:

```bash
yc serverless api-gateway get trustlayer --format json | jq -r .domain
# -> d5d....apigw.yandexcloud.net
```

Smoke-test:

```bash
API=https://<gateway-domain>
curl "$API/health"
curl -XPOST "$API/analyze/text" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Studies show this 100% guaranteed miracle cure!"}'
curl "$API/reports"
```

---

## 2. Frontend — Cloudflare Pages

### One-time project creation

Via Cloudflare dashboard: Pages → Create project → Connect Git →
select this repo. Or via Wrangler:

```bash
npm i -g wrangler
wrangler login
wrangler pages project create trustlayer --production-branch main
```

### Build settings (Cloudflare Pages UI)

- **Framework preset:** None (custom)
- **Build command:** `npm ci && npm --workspace frontend run build`
- **Build output directory:** `frontend/dist`
- **Root directory:** (leave blank — this is a monorepo; commands run at repo root)
- **Environment variables (Production):**
  - `VITE_API_BASE` = `https://<your-api-gateway-domain>` (no trailing slash)
  - `NODE_VERSION` = `20`

A committed config file at `frontend/wrangler.toml` documents the same.

### Manual deploy from CI / local

```bash
npm ci
npm --workspace frontend run build -- \
  --mode production
wrangler pages deploy frontend/dist --project-name trustlayer
```

---

## 3. Local dev (no cloud)

```bash
npm ci
cp .env.example backend/.env   # AI_MODE=mock by default
npm run dev:backend             # http://localhost:8787
npm run dev:frontend            # http://localhost:5173 (proxies /api → 8787)
```

In mock mode the backend does no outbound network calls and works fully
offline. Flip `AI_MODE=yandex` in `backend/.env` to hit the real model.
