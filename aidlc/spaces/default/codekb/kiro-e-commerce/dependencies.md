# Dependencies

## External Dependencies

Runtime (`dependencies`): express, react, react-dom, react-router-dom. Dev (`devDependencies`): typescript, tsx, vite, @vitejs/plugin-react, vitest, supertest, concurrently and the `@types/*` packages. All pinned exactly; versions are listed once in `technology-stack.md`.

Built-in Node modules used: `node:sqlite`, `node:crypto`, `node:fs`, `node:path`, `node:util`; global `fetch` and `AbortController`.

External service: Amazon Bedrock Runtime (optional; only when `AWS_BEARER_TOKEN_BEDROCK` is set). Without it, the assistant runs fully offline on the rule parser.

Environment variables (documented in `.env.example`): `AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION`, `BEDROCK_MODEL_ID`, `PORT`, `DB_PATH`, `ORDER_SHIP_SECONDS`, `ORDER_DELIVER_SECONDS`.

## Internal Dependencies (server)

```
index.ts     -> app.ts, config.ts, db.ts, seed.ts
app.ts       -> assistant.ts, auth.ts, config.ts (types), db.ts (type), errors.ts, orders.ts, repo.ts, seed.ts
assistant.ts -> config.ts (type), db.ts (type), repo.ts, seed.ts
auth.ts      -> db.ts (type), errors.ts, repo.ts
orders.ts    -> config.ts (type), db.ts, errors.ts, repo.ts
repo.ts      -> db.ts (type), seed.ts (type)
seed.ts      -> db.ts (type)
config.ts    -> node built-ins
errors.ts    -> none
db.ts        -> node:sqlite
```

## Internal Dependencies (client)

```
main.tsx                 -> App.tsx, session.tsx, styles.css
App.tsx                  -> components/Header, pages/*, session.tsx
session.tsx              -> api.ts
hooks.ts                 -> api.ts, session.tsx
components/Header        -> session.tsx
components/Assistant     -> api.ts, format.ts, components/ProductCard
components/ProductCard   -> api.ts (type), format.ts, hooks.ts
components/StatusBadge   -> api.ts (type)
pages/HomePage           -> api.ts, components/Assistant, components/ProductCard
pages/ProductPage        -> api.ts, format.ts, hooks.ts
pages/LoginPage, SignupPage -> api.ts, format.ts, session.tsx
pages/CartPage, CheckoutPage -> api.ts, format.ts, session.tsx
pages/OrdersPage         -> api.ts, components/StatusBadge, format.ts, hooks.ts
pages/OrderDetailPage    -> api.ts, components/StatusBadge, format.ts, hooks.ts, pages/OrdersPage (REFRESH_MS)
```

## Tests

```
tests/orders.test.ts -> server/assistant, config, db, orders, repo, seed
tests/e2e.test.ts    -> server/app, config, db, repo, seed; supertest
```

## Client to Server Coupling

The client imports nothing from `server/`; the contract is the HTTP API (`api-documentation.md`). Client types in `api.ts` are hand-maintained copies of server shapes.

## Circular References

None found.
