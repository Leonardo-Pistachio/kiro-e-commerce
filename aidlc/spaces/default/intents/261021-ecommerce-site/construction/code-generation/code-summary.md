# Code Summary — PC E-Commerce Store (Proof of Concept)

## Files Created

- Config: `package.json` (exact versions), `.npmrc`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.env.example` (empty placeholders), `README.md`; `.gitignore` gained `node_modules/`, `dist/`, `data/`, `.env`.
- Server: `server/config.ts`, `server/db.ts`, `server/seed.ts`, `server/repo.ts`, `server/errors.ts`, `server/auth.ts`, `server/orders.ts`, `server/assistant.ts`, `server/app.ts`, `server/index.ts`.
- Client: `client/index.html`, `client/src/` (`main.tsx`, `App.tsx`, `api.ts`, `session.tsx`, `hooks.ts`, `format.ts`, `styles.css`, components `Header`, `ProductCard`, `Assistant`, `StatusBadge`, pages HomePage, ProductPage, LoginPage, SignupPage, CartPage, CheckoutPage, OrdersPage, OrderDetailPage), `client/public/images/` (4 category SVGs).
- Tests: `tests/orders.test.ts`, `tests/e2e.test.ts`.

## Key Implementation Decisions

- Oversell protection: each order runs in one `BEGIN IMMEDIATE` SQLite transaction with a conditional `UPDATE ... WHERE stock >= ?`; any short line rolls back the whole order and the response names the product.
- Order status is derived from placement time and configured timings (Shipped 30 s, Delivered 60 s) and written back on read, so restarts cannot strand an order; cancel is judged against the status at request time and returns stock in the same transaction. Pending is defined but never reached.
- Money is stored in cents; errors are JSON `{error:{code,message,details}}`; another shopper's order returns 404.
- Assistant: Bedrock Converse via fetch with bearer token and 8 s timeout, validated JSON filters, rule-based fallback; products always come from the store database; the response names the source used.
- Security baseline: scrypt with per-user salt and timing-safe compare, random 32-byte session tokens with 7-day expiry, prepared statements, 50 kb body limit, basic security headers. The Bedrock key is read from `.env` only and never logged or bundled.
- `npm start` builds the client and serves API plus client on port 3001.

## Test Coverage Summary

- `npx vitest run tests/orders.test.ts tests/e2e.test.ts`: 2 files, 30 tests, all passing (re-run by the conductor after the build).
- `tests/orders.test.ts` (11): status derivation at 0, 30, 60 s; cancel rules; stock return; rule-based assistant parser.
- `tests/e2e.test.ts` (19): browse, search, filter, sign-up, login, cart, quantity, checkout, My Orders details, buy now, auth refusals, another user's order refused, concurrent last-unit orders where exactly one succeeds and stock ends at 0, persistence through a reopened file database.
- `npm run typecheck` and `npm run build` pass.

## Tests Written but Not Executed

- None. Not exercised: the live Bedrock call (tests run without a key by design), front-end component tests (omitted by plan Step 12), and a manual browser walkthrough (left for Build and Test and the demo).

## Deviations from the Plan

- React Router 7.18.4 and Vitest 4.1.11 instead of the 6.x and 3.x lines, to avoid audited advisories.
- `.npmrc` sets `legacy-peer-deps=true` and `save-exact=true` to work around an npm 11.5.1 resolver crash on Vitest's optional peers.
- Cart update and remove routes are `PATCH` and `DELETE /api/cart/:productId` rather than `/api/cart`.
- Session tokens are random and server-stored, not cryptographically signed (NFR5 wording).
- No login rate limiting; the server listens on all interfaces. Both noted in the README.
