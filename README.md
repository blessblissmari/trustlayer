# TrustLayer

> **Risk-analysis tool for digital content. Not a truth detector.**

TrustLayer ingests free text or a URL and produces a **risk report** with:

- a **trust score** from 0–100 (100 = lower risk; reflects *phrasing and
  sourcing patterns*, not factual accuracy),
- **risk flags** (absolute-certainty language, clickbait phrasing, conspiracy
  framing, urgency tactics, etc.),
- **suspicious patterns** with counts and severity,
- **unverifiable claims** (appeals to unnamed authorities),
- a plain-language **explanation** that always includes a disclaimer.

TrustLayer deliberately avoids any framing around "truth detection". It is a
risk-analysis aid. Final judgment is always the user's.

## Stack

| Layer    | Tech                                                      |
| -------- | --------------------------------------------------------- |
| Frontend | React 18 + Vite + TypeScript                              |
| Hosting  | Cloudflare Pages (static)                                 |
| Backend  | Node.js 18 Cloud Function behind **Yandex API Gateway**   |
| AI       | **YandexGPT** (server-side only) + rule-based scoring     |
| Storage  | Swappable abstraction (memory / file / bring-your-own DB) |

## Repo layout

```
.
├── frontend/      # React + Vite app (Cloudflare Pages)
├── backend/       # Yandex Cloud Function handlers + local dev server
├── infra/         # OpenAPI spec for Yandex API Gateway, deploy docs
└── .env.example   # Backend env variables (copy to backend/.env)
```

## API

All routes return JSON. CORS is permissive by default; restrict via
`CORS_ORIGIN` in production.

| Method | Path            | Body                           | Returns                |
| ------ | --------------- | ------------------------------ | ---------------------- |
| POST   | `/analyze/text` | `{ "text": "..." }`            | `AnalysisReport`       |
| POST   | `/analyze/url`  | `{ "url": "https://..." }`     | `AnalysisReport`       |
| GET    | `/reports`      | `?limit=50`                    | `{ reports, total }`   |
| GET    | `/health`       | —                              | `{ status, aiMode }`   |

`AnalysisReport` shape is defined in
[`backend/src/types.ts`](backend/src/types.ts).

Example:

```bash
curl -sXPOST http://localhost:8787/analyze/text \
  -H 'Content-Type: application/json' \
  -d '{"text":"Studies show this 100% guaranteed miracle cure!!!"}' | jq
```

## Quick start (local, mock AI — no credentials needed)

```bash
npm ci
cp .env.example backend/.env     # AI_MODE=mock
npm run dev:backend              # http://localhost:8787
# in another shell:
npm run dev:frontend             # http://localhost:5173
```

Open <http://localhost:5173>, paste some text, click **Analyze**.

The mock AI runs fully offline. Switch to the real YandexGPT by editing
`backend/.env`:

```
AI_MODE=yandex
YANDEX_API_KEY=<your api key>
YANDEX_GPT_MODEL=gpt://<folder_id>/yandexgpt/latest
```

See [`infra/deploy.md`](infra/deploy.md) for how to obtain these.

## AI behavior & safety

- **YandexGPT calls happen only server-side.** The frontend never sees the
  API key. The model URI and key come from Cloud Function env vars.
- The model is instructed (see `backend/src/ai/yandexGpt.ts`) to **never
  assert truth or falsity** and to return structured JSON with risky
  phrases, unverifiable claims, and a credibility estimate on a 0–100
  quality-of-sourcing scale.
- If the model response is malformed or credentials are missing at runtime,
  the backend **falls back to mock mode** rather than 500-ing. The
  `aiMode` field in every report reflects which path actually ran.
- Rule-based scoring (`backend/src/scoring/rules.ts`) runs on every request
  and is blended 40/60 with the AI's credibility estimate, so a human can
  always audit *why* a score came out the way it did.

## Build & test

```bash
npm run build           # build frontend + backend
npm run typecheck       # typecheck both workspaces
npm --workspace backend run test   # Node's built-in test runner
```

## Deploy

See [`infra/deploy.md`](infra/deploy.md) for step-by-step instructions for
Yandex Cloud Functions + API Gateway and Cloudflare Pages.

## License

MIT — see [`LICENSE`](LICENSE).
