# Build Instructions — PC E-Commerce Store

## Prerequisites

- Node.js 24 or newer (verified on v24.14.0) and npm 11 (verified on 11.5.1).
- No database server: the app uses Node's built-in SQLite and creates `data/store.db` on first start.

## Dependency Installation

- From the project root: `npm install` (exact versions are pinned; `.npmrc` sets `legacy-peer-deps=true` and `save-exact=true`).

## Environment Setup

- Copy `.env.example` to `.env` to enable the Bedrock assistant: `AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION` (default `us-east-1`), optional `BEDROCK_MODEL_ID` (default `us.amazon.nova-lite-v1:0`). Without a key the assistant uses its rule-based parser.
- Optional: `PORT` (default 3001), `DB_PATH` (default `data/store.db`), `ORDER_SHIP_SECONDS` (default 30), `ORDER_DELIVER_SECONDS` (default 60).

## Build Commands

- Type check: `npm run typecheck`
- Client bundle: `npm run build` (outputs `dist/`)
- Demo run: `npm start` (builds the client, then serves API and app on http://localhost:3001)
- Development: `npm run dev` (API with reload plus Vite dev server)

## Build Verification

- `npm run typecheck` exits 0.
- `npm run build` prints `built in ...` and writes `dist/index.html`.
- After `npm start`, `GET /api/health` returns `{"ok":true}` and the startup log says `Seeded 20 products` on a fresh database.

## Troubleshooting

- `ExperimentalWarning: SQLite is an experimental feature` on start is expected on Node 24 and harmless.
- npm crash "reading 'edgesOut'": keep the `.npmrc` settings.
- Port already in use: set `PORT` to another value.
- To reset demo data: stop the server and delete `data/store.db`.
