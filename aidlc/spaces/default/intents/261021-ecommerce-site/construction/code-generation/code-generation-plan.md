# Code Generation Plan — PC E-Commerce Store (Proof of Concept)

## Summary

- Builds: a full-stack TypeScript PC store (catalog, auth, cart, checkout, orders, assistant, oversell-safe stock)
- Touches: package.json, tsconfig files, server/ (Express API + SQLite), client/ (React + Vite), tests/
- Tests: 2 automated test files: order-rule unit tests and one API end-to-end flow suite (full flow plus oversell race)

## Context

- Source: `inception/requirements-analysis/requirements.md` (FR1 to FR8, NFR1 to NFR7). No units, functional or NFR design exist for the poc plan; scope comes from the requirements only.
- Greenfield, zero-Unit build. Node 24.14, npm 11. All TypeScript (NFR3).
- Build priority (2-hour budget): core flow FR1 to FR6 with its end-to-end test first, then FR8 oversell protection, then FR7 assistant.

## Technical Decisions

- Runtime: Node 24 with `tsx` to run TypeScript directly; no separate server build step.
- Back end: Express 5 REST API on port 3001.
- Persistence: Node's built-in `node:sqlite` (`DatabaseSync`), one file at `data/store.db`; schema and seed created on first start (NFR1). No native module compile.
- Auth: passwords hashed with `crypto.scrypt` plus per-user salt; opaque random session tokens stored in a `sessions` table, sent as `Authorization: Bearer` (FR2, NFR5).
- Oversell protection: every order is placed inside one `BEGIN IMMEDIATE` transaction that decrements stock with `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`; any line that changes 0 rows rolls back the whole order (FR4.3, FR8).
- Order lifecycle: status is derived from `placed_at` and the configured timings (default Shipped at 30 s, Delivered at 60 s, env `ORDER_SHIP_SECONDS`, `ORDER_DELIVER_SECONDS`) and written back on read, so a restart cannot leave an order stuck. Cancel is judged by the server against the derived status at the moment it is received (FR5). Pending stays in the state list but is never reached, since payment is simulated and immediate (FR4.2).
- Assistant: if `AWS_BEARER_TOKEN_BEDROCK` is set, call the Bedrock Converse REST endpoint with a bearer token (model from `BEDROCK_MODEL_ID`, default `us.amazon.nova-lite-v1:0`, region from `AWS_REGION`, default `us-east-1`) asking for a JSON filter object only; on missing key, timeout (8 s) or invalid output, use the rule-based parser. Products are always looked up in the store's own database (FR7).
- Front end: React 18 + React Router + Vite, dev proxy `/api` to port 3001. Order pages poll every 5 s (FR6.3). Product images are bundled SVG placeholders per category.
- Secrets: `.env` loaded with `process.loadEnvFile()` when present; the key is never logged or sent to the browser (NFR4).

## Testing Contract
```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "poc",
  "test_strategy": "minimal",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c5db1280ba0333b655bcf97bdcaeaa0fd9cc0f50807a6ee879935b8aff3e17e0",
  "contract_sha256": "sha256:be5041ec2297dded1a31f328fae6a86555cf649f231018ea8168c9bb8dd811a5"
}
```

## Steps

- [x] Step 1: Project structure and configuration skeleton. Create `package.json` (scripts: `dev`, `server`, `client`, `build`, `start`, `typecheck`, `test`), `tsconfig.json`, `vite.config.ts`, `.env.example` (no secret values), and install pinned dependencies. Traces: NFR2, NFR3, NFR4.
- [x] Step 2: Bootstrap the test runner. Add `vitest.config.ts` (node environment, `tests/**/*.test.ts`) and `supertest`; record the exact commands in `unit-test-instructions.md`. Traces: NFR7.
- [x] Step 3: Data model and database. `server/db.ts`: open `data/store.db` (path overridable by `DB_PATH`, `:memory:` for tests), create tables `users`, `sessions`, `products`, `cart_items`, `orders`, `order_items`; `server/seed.ts`: 20 PCs across Laptops, Desktops, Monitors, Accessories in US dollars, seeded only when `products` is empty. Traces: FR1.1, NFR1.
- [x] Step 4: Data model tests: covered by the API end-to-end suite in Step 10 (seed count, persistence through a reopened file database). Minimal strategy: no separate data-layer test file.
- [x] Step 5: Repository / data access. `server/repo.ts`: typed query functions for products (search text, category, price range), users, sessions, cart lines, orders and order items, using prepared statements only. Traces: FR1.3, FR1.4, FR3.4, FR6.1.
- [x] Step 6: Repository tests: covered by the API end-to-end suite in Step 10 (search and filter results). Minimal strategy: no separate repository test file.
- [x] Step 7: Business logic. `server/auth.ts` (scrypt hashing, sign-up, login, logout, token lookup); `server/orders.ts` (derived status from timings, `placeOrder` in one `BEGIN IMMEDIATE` transaction with conditional stock decrement and all-or-nothing rollback, `cancelOrder` with stock return allowed only while Pending or Paid); `server/assistant.ts` (Bedrock Converse call with bearer token and 8 s timeout, JSON filter validation, rule-based fallback parser for price phrases, categories and keywords). Traces: FR2.1 to FR2.5, FR4.2, FR4.3, FR5.1 to FR5.5, FR7.2 to FR7.4, FR8.1, FR8.2, NFR4.
- [x] Step 8: Business logic tests. `tests/orders.test.ts`: status derivation (Paid at 0 s, Shipped at 30 s, Delivered at 60 s), cancel allowed before Shipped and refused after, cancel returns stock, rule-based assistant parser turns "gaming laptop under 1500" into category Laptops and max price 1500. Run `npx vitest run tests/orders.test.ts`. Traces: FR5.2, FR5.3, FR5.4, FR7.3.
- [x] Step 9: API layer. `server/app.ts` (Express app factory, JSON errors, input validation, auth middleware checking the session owner on every cart and order route) and `server/index.ts` (load `.env`, open database, seed, listen on 3001). Routes: `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`, `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET/POST/PATCH/DELETE /api/cart`, `POST /api/orders` (from cart, or `buyNow` item), `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel`, `POST /api/assistant`. Traces: FR1 to FR8, NFR5.
- [x] Step 10: API end-to-end tests. `tests/e2e.test.ts` with supertest against the app on an in-memory database: browse and search, sign up and log in, add to cart and change quantity, checkout with shipping info, view the order in My Orders with items, amount, shipping and status; buy now; access denied without login and for another user's order; two simultaneous orders for the last unit where exactly one succeeds and stock ends at 0. Run `npx vitest run tests/e2e.test.ts`. Traces: FR1 to FR6, FR8, NFR7.
- [x] Step 11: Front end. `client/` React app: header with search, login state and cart count; Home (catalog grid with image, name, price, search box, category filter, assistant box showing applied filters); Product detail (stock, quantity, Add to Cart, Buy Now); Login and Sign up; Cart (quantities, remove, total, Checkout); Checkout (shipping form, simulated payment, place order); My Orders (list, newest first, auto refresh every 5 s); Order detail (items, amount, shipping, status, Cancel while allowed). `data-testid` on every interactive element. Placeholder SVG images in `client/public/images/`. Traces: FR1 to FR7.
- [x] Step 12: Front end tests: omitted for this 2-hour proof of concept. The person chose one end-to-end check (RA-Q4), which runs at the API level; the front end is checked by `npm run typecheck`, `npm run build` and the live demo walkthrough.
- [x] Step 13: Environment and build configuration. `npm run build` builds the client into `dist/`; `npm start` serves the API and the built client from port 3001 for the demo; `npm run dev` runs API and Vite together. Confirm `npm run typecheck` and `npm run build` pass.
- [x] Step 14: Documentation and traceability. `README.md` with setup, `.env` usage (no secret values), demo script for the full flow and the cancel window, and how to show the oversell protection.
