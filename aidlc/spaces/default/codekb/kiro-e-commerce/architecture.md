# Architecture

## Architecture Analysis

### System Overview

A single Node 24 process runs an Express 5 JSON API under `/api` and, in production (`npm start`), serves the Vite-built React SPA from `dist/` with an `index.html` fallback for client routes. Data lives in one SQLite file (`data/store.db`, `node:sqlite`, WAL). The only external system is Amazon Bedrock Runtime, called by the shopping assistant when a bearer key is configured. In development Vite (5173) proxies `/api` to the API (3001).

### Architectural Style

Modular monolith, layered by file (evidence: `server/app.ts` composes everything in `createApp`; no services or queues):

- Routing and input parsing: `server/app.ts`
- Domain logic: `server/orders.ts`, `server/auth.ts`, `server/assistant.ts`
- Data access: `server/repo.ts` (prepared statements only), schema in `server/db.ts`
- Cross-cutting: `server/errors.ts` (AppError), `server/config.ts` (env)
- Client: React SPA with a context store (`session.tsx`) and one typed fetch wrapper (`api.ts`)

Dependencies are injected through `AppOptions` (db, timings, assistant config, `now`, `fetchImpl`, `staticDir`), which is what makes the API testable without a port or real clock.

### Component Relationships

```mermaid
flowchart LR
  subgraph Browser
    UI[Pages and components] --> SES[session.tsx SessionProvider]
    UI --> API[api.ts request]
    SES --> API
  end
  API -->|HTTP JSON /api| APP[server/app.ts createApp]
  APP --> AUTH[auth.ts]
  APP --> ORD[orders.ts]
  APP --> AST[assistant.ts]
  APP --> REPO[repo.ts]
  AUTH --> REPO
  ORD --> REPO
  ORD --> DB[db.ts inTransaction]
  AST --> REPO
  AST -->|HTTPS Converse| BR[(Amazon Bedrock Runtime)]
  REPO --> SQL[(SQLite store.db)]
  IDX[server/index.ts] --> APP
  IDX --> CFG[config.ts]
  IDX --> SEED[seed.ts]
```

Text fallback: browser UI calls `api.ts`, which calls the Express app; the app routes to auth, orders and assistant modules, all of which read and write SQLite through `repo.ts`; the assistant may also call Bedrock. `index.ts` loads config, opens and seeds the DB, and starts the app. Full component list: `component-inventory.md`.

### Data Flow

- Requests carry JSON bodies (limit 50 kb) and, for cart and order routes, `Authorization: Bearer <token>`. `requireAuth` resolves the token to a user in `res.locals`.
- Handlers validate input, call domain functions with `db` and `now()`, and return JSON. Thrown `AppError`s become `{ error: { code, message, details } }`; anything else becomes a 500 with a generic message.
- Order status is derived from elapsed time on read (`deriveStatus`) and written back when it changed; there is no background job.
- Assistant: request text to filters (Bedrock or rules), filters (dollars) converted to cents, then `listProducts`. The model never supplies product data.
- Client keeps the session token in `localStorage` (`pc-store-token`) and cart count in context; order pages poll every 5 s.

### Key Design Decisions

- Built-in `node:sqlite` instead of a native driver: no compile step; synchronous calls make `BEGIN IMMEDIATE` transactions simple.
- Oversell protection by conditional `UPDATE ... WHERE stock >= ?` inside one transaction per order.
- LLM output treated as untrusted: strict JSON extraction and `validateFilters`, rule-based fallback on any failure or timeout (8 s), key only in a server-side header.
- Time-derived lifecycle with an injectable clock, so tests use fixed timestamps.
- Security headers set globally (`nosniff`, `X-Frame-Options: DENY`, `no-referrer`), `Cache-Control: no-store` on `/api`, `x-powered-by` disabled.

### Improvement Opportunities

- Assistant is stateless and single-turn; a chat experience needs either client-side history or a contract extension (see `api-documentation.md`).
- No rate limiting on the public assistant endpoint or on login.
- Shared types and the category list are duplicated between client and server (see `code-quality-assessment.md`).
- Listens on all interfaces; intended for a trusted network.

## Interaction Diagrams

### Shopping assistant request (existing; basis for the chat widget)

```mermaid
sequenceDiagram
  participant S as Shopper
  participant A as Assistant.tsx
  participant C as api.ts
  participant R as app.ts POST /api/assistant
  participant X as assistant.ts runAssistant
  participant B as Amazon Bedrock
  participant D as repo.ts listProducts
  S->>A: type request or click example
  A->>C: api.assistant(text)
  C->>R: POST /api/assistant with message
  R->>R: validate 1 to 300 chars
  R->>X: runAssistant(db, message, config, fetch)
  alt Bedrock key configured
    X->>B: Converse with system prompt, 8 s timeout
    B-->>X: text with JSON filter object
    X->>X: extractJsonObject and validateFilters
  end
  opt no key, error, timeout or invalid output
    X->>X: parseRules(message)
  end
  X->>D: listProducts with category, price cents, keywords
  opt no match and keywords present
    X->>D: listProducts without keywords
  end
  X-->>R: source, filters, keywordsRelaxed, products
  R-->>C: 200 JSON
  C-->>A: AssistantResult
  A-->>S: source chip, filter chips, ProductGrid
```

Text fallback: the panel posts the message; the server validates it, gets filters from Bedrock or the rule parser, queries the catalog (retrying without keywords if needed) and returns source, filters and products, which the panel renders as chips and product cards.

### Checkout (place order)

```mermaid
sequenceDiagram
  participant P as CheckoutPage
  participant R as app.ts POST /api/orders
  participant O as orders.ts placeOrder
  participant Q as repo.ts
  P->>R: shipping and optional buyNow, Bearer token
  R->>R: requireAuth, validateShipping
  R->>O: placeOrder(lines from cart or buyNow)
  O->>Q: BEGIN IMMEDIATE
  loop each merged line
    O->>Q: decrementStockIfAvailable
  end
  alt any shortage
    O->>Q: ROLLBACK
    O-->>R: 409 OUT_OF_STOCK with shortages
  else all reserved
    O->>Q: insertOrder Paid, insertOrderItem, clearCart if from cart
    O->>Q: COMMIT
    O-->>R: OrderView
  end
  R-->>P: 201 order or error envelope
```

Text fallback: checkout posts shipping data; within one immediate transaction each line's stock is conditionally decremented; any shortage rolls everything back with a 409, otherwise the order is inserted as Paid, the cart cleared, and the order view returned.

### Login and authenticated request

```mermaid
sequenceDiagram
  participant L as LoginPage
  participant SP as SessionProvider
  participant R as app.ts
  participant AU as auth.ts
  L->>R: POST /api/auth/login
  R->>AU: login, scrypt verify, createSession
  AU-->>R: token and user
  R-->>L: 200
  L->>SP: signIn stores token in localStorage
  SP->>R: GET /api/cart with Bearer token
  R->>AU: userForToken via requireAuth
  R-->>SP: cart count
```

Text fallback: login verifies the scrypt hash and creates a session token; the client stores it and sends it as a bearer header; `requireAuth` resolves it on every protected route, and a 401 clears the local session.
