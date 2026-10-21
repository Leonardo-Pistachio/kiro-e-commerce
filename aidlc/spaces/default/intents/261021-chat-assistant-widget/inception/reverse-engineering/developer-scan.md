# Developer Code Scan: kiro-e-commerce

Intent: create a chatbox AI assistant on the bottom right corner with a circle as a button, when clicked open a chat bot to recommend some products.
Breadth: full scan (first scan, no prior store). Depth: Minimal. Commit: unknown (not a git repo).

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `server/` (app.ts, assistant.ts, auth.ts, config.ts, db.ts, errors.ts, index.ts, orders.ts, repo.ts, seed.ts)
  - `client/index.html`
  - `client/src/` (main.tsx, App.tsx, api.ts, session.tsx, hooks.ts, format.ts, styles.css, components/, pages/)
  - `tests/` (orders.test.ts, e2e.test.ts)
  - `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.npmrc`, `.env.example`, `README.md`
  - `.gitignore` (project-owned lines only, below the AI-DLC block)
- **Skimmed only**:
  - `client/public/images/` (4 category SVG placeholders, not read line by line)
  - `package-lock.json` (lockfile; versions taken from package.json)
- **Left out**:
  - `node_modules/` (dependencies, gitignored)
  - `dist/` (Vite build output, gitignored)
  - `data/` (SQLite runtime data, gitignored)
  - `.env` (local secrets, gitignored; not opened by instruction)
  - `.kiro/`, `aidlc/`, and the AI-DLC marked sections of `AGENTS.md` and `.gitignore` (AI-DLC install, not project code; `AGENTS.md` has no project-owned content outside its marker)

### Packages Found
- kiro-pc-store (root `package.json`, ESM, private, v0.1.0) — single-package full-stack app — TypeScript — PoC online PC store
  - `server/` — Express 5 API plus static host — TypeScript on Node 24 via tsx
  - `client/` — React 18 SPA built by Vite — TypeScript/TSX
  - `tests/` — Vitest suites (server side only)

### Build System
- **Type**: npm 11 scripts; Vite 6 for the client; tsx (no compile step) for the server; tsc for type-check only (`noEmit`)
- **Config Files**: `package.json`, `package-lock.json`, `.npmrc` (save-exact, legacy-peer-deps), `tsconfig.json`, `vite.config.ts` (root `client`, outDir `../dist`, dev proxy `/api` to 3001), `vitest.config.ts`
- **Build Dependencies**: `start` = `vite build` then `tsx server/index.ts`; server serves `dist/` when `dist/index.html` exists; `dev` = concurrently `tsx watch server/index.ts` plus `vite` (5173)

### APIs Discovered
- REST/JSON (Express 5) — `server/app.ts` — 17 routes under `/api` (health, categories, products x2, auth x4, cart x4, orders x4, assistant x1) plus a JSON 404 catch-all and SPA fallback
- Outbound HTTP — `server/assistant.ts` `askBedrock` — 1 call: Amazon Bedrock Runtime Converse `POST https://bedrock-runtime.<region>.amazonaws.com/model/<modelId>/converse`, bearer token, 8 s timeout
- Client API module — `client/src/api.ts` — 16 typed methods on `api` (incl. `api.assistant(message)`)

### Frameworks & Libraries
- express — 5.2.1 — HTTP API (async handler errors propagate to the error middleware)
- react / react-dom — 18.3.1 — UI
- react-router-dom — 7.18.4 — client routing (BrowserRouter)
- node:sqlite (`DatabaseSync`) — built into Node 24 — persistence, WAL mode
- node:crypto scrypt — built in — password hashing
- vite 6.4.5 with @vitejs/plugin-react 4.7.0 — client dev server and bundler
- tsx 4.23.15 — runs server TS directly
- typescript 5.9.3 — strict type-check
- vitest 4.1.11, supertest 7.3.1 — tests
- concurrently 9.2.5 — dev script

### Test Coverage
- **Test Directories**: `tests/`
- **Test Frameworks**: Vitest (node environment) plus supertest against `createApp` (no port opened), in-memory SQLite, Bedrock key forced empty
- **Coverage Config**: absent (no coverage provider or thresholds in `vitest.config.ts`)
- Covered: order status derivation and cancel rules, rule-based assistant parser and `validateFilters`, full API flow, access control, oversell race, persistence across reopen, assistant via rules path and empty-message 400
- Not covered: any client/React code (no jsdom, no component tests), the Bedrock success path of `askBedrock` (injectable `fetchImpl` exists but no test uses it)

### Code Quality Indicators
- **Linting**: none (no ESLint/Prettier config); `tsc --noEmit` with `strict`, `noUnusedLocals`, `noUnusedParameters`
- **CI/CD**: none found (no `.github/`, no pipeline files)
- **Documentation**: README is thorough (run, config, demo script, API table, known limits); short intent comments at module heads; JSDoc on key functions

### Technical Debt Signals
- No TODO/FIXME/HACK or lint suppressions found in `server/`, `client/src/`, `tests/`
- Duplicated domain constants: category list in `server/seed.ts`, `server/db.ts` (CHECK constraint), `client/src/api.ts` (type) and `client/src/pages/HomePage.tsx` (array); client types in `api.ts` hand-mirror server types
- `GET /api/categories` and `api.categories()` exist but the client hard-codes categories instead
- `POST /api/assistant` is public and unauthenticated with no rate limiting while it can trigger a paid Bedrock call (README lists no login rate limiting either)
- `STOP_WORDS` in `server/assistant.ts` lists `under` twice (harmless)
- Single global stylesheet `client/src/styles.css`; sticky header uses `z-index: 10`
- No linter, no CI, no client tests

## Handoff Summary
- **Intent-relevant finding**: The assistant already exists end to end. Server: `POST /api/assistant` in `server/app.ts` (public, body `{ message }`, 1 to 300 chars, trimmed) calls `runAssistant` in `server/assistant.ts`, which asks Bedrock (Converse API, Nova Lite default) for a JSON filter object, validates it with `validateFilters`, falls back to `parseRules` on any failure or when no key is set, then looks products up only from SQLite via `listProducts` (keywords dropped if they alone match nothing, flagged `keywordsRelaxed`). Response: `{ source: 'bedrock' or 'rules', filters, keywordsRelaxed, products }`; there is no conversational reply text and no conversation history, the call is single-turn and stateless. Client: `client/src/components/Assistant.tsx` is an inline panel rendered only on `HomePage` (`<Assistant />` above the catalog); it calls `api.assistant(text)`, shows source and filter chips, and renders results with `ProductGrid` (cards with Add to cart via `useAddToCart`). A global floating widget would mount in `client/src/App.tsx` (inside `BrowserRouter` and `SessionProvider`, so `ProductGrid` and `useAddToCart` work on every route).
- **Risks / follow-up**:
  - `Assistant.tsx` uses fixed DOM ids (`assistant-input`, `assistant-title`) and testids (`assistant-panel`, `assistant-input`, `assistant-result` ...); rendering a widget alongside the home-page panel would duplicate ids unless the widget uses its own ids or the panel is replaced
  - The response has no reply sentence; a chat UI must compose its message text client-side from `filters` and `products`, or the server contract must be extended (keep backward compatible with `tests/e2e.test.ts` assertions on `source` and `filters`)
  - Existing behaviour to preserve: the model only produces filters, products always come from the database, the Bedrock key never leaves the server, rule-based fallback on any failure, 300-char limit, 50 kb JSON limit
  - Overlay stacking: header is `position: sticky; z-index: 10`; widget needs a higher layer and must stay keyboard and screen-reader accessible (existing code uses visually-hidden labels and `role="alert"`)
  - Endpoint is unauthenticated with no rate limiting; a more prominent widget may raise Bedrock call volume
  - No client test harness exists; Vitest config includes only `tests/**/*.test.ts` in node environment
