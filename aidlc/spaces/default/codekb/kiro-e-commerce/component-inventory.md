# Component Inventory

Each heading below is a component name used verbatim by the Scope of Analysis block in `reverse-engineering-timestamp.md`.

## Server Entry

- File: `server/index.ts`
- Responsibility: load `.env`, read config, open and seed the DB, start the HTTP server on `PORT`, serve `dist/`, graceful shutdown on SIGINT/SIGTERM.
- Depends on: Server Config, Database, Seed Catalog, API Router.

## Server Config

- File: `server/config.ts`
- Responsibility: env parsing (`PORT`, `DB_PATH`, `ORDER_SHIP_SECONDS`, `ORDER_DELIVER_SECONDS`, `AWS_BEARER_TOKEN_BEDROCK`, `AWS_REGION`, `BEDROCK_MODEL_ID`), defaults, `.env` loading via `process.loadEnvFile` without echoing values.
- Depends on: Node built-ins.

## API Router

- File: `server/app.ts` (`createApp`)
- Responsibility: security headers, JSON parsing, `requireAuth`, all `/api` routes (see `api-documentation.md`), static SPA hosting, JSON error middleware.
- Depends on: Auth Service, Order Service, Shopping Assistant Service, Data Access, Error Model, Seed Catalog (categories).

## Auth Service

- File: `server/auth.ts`
- Responsibility: signup validation, scrypt hashing with per-user salt, timing-safe verify, 32-byte session tokens with 7-day TTL, logout, token lookup.
- Depends on: Data Access, Error Model.

## Order Service

- File: `server/orders.ts`
- Responsibility: status derivation by elapsed time, cancel rules, shipping validation, `parsePositiveInt`, `placeOrder` and `cancelOrder` in immediate transactions, order views.
- Depends on: Data Access, Database (`inTransaction`), Error Model.

## Shopping Assistant Service

- File: `server/assistant.ts`
- Responsibility: turn a natural-language request into validated catalog filters via Bedrock (`askBedrock`) or the rule parser (`parseRules`), with fallback in `interpretRequest`; look up products with keyword relaxation (`findAssistantProducts`); entry `runAssistant`. Exports `validateFilters`, `extractJsonObject`, `parseRules` (tested).
- Depends on: Data Access (`listProducts`), Seed Catalog (`CATEGORIES`), Server Config (`AssistantConfig`), Amazon Bedrock (external).

## Data Access

- File: `server/repo.ts`
- Responsibility: typed prepared-statement queries for products, users, sessions, cart, orders and order items; LIKE escaping; conditional stock decrement.
- Depends on: Database.

## Database

- File: `server/db.ts`
- Responsibility: open SQLite (`node:sqlite`), pragmas (foreign keys, busy timeout, WAL), idempotent schema, `inTransaction` helper.
- Tables: `users`, `sessions`, `products`, `cart_items`, `orders`, `order_items`.

## Seed Catalog

- File: `server/seed.ts`
- Responsibility: `CATEGORIES` constant and `Category` type; 20 seed products; inserts only when `products` is empty.
- Depends on: Database.

## Error Model

- File: `server/errors.ts`
- Responsibility: `AppError` and factories `badRequest`, `unauthorized`, `notFound`, `conflict`.

## Client Bootstrap and Routes

- Files: `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`
- Responsibility: mount React in StrictMode with `BrowserRouter` and `SessionProvider`; route table; `RequireLogin` guard; 404 page. `App` renders `Header` plus `main.container`; this is the natural global mount point for a floating chat widget.

## API Client

- File: `client/src/api.ts`
- Responsibility: typed `api` methods, shared client types (including `AssistantResult`, `AssistantFilters`), bearer token holder, `ApiError`, `errorMessage`.

## Session Store

- File: `client/src/session.tsx`
- Responsibility: `SessionProvider` and `useSession`: user, readiness, cart count, `signIn`, `signOut`, `refreshCart`; token in `localStorage` key `pc-store-token`.
- Depends on: API Client.

## Client Hooks and Formatting

- Files: `client/src/hooks.ts`, `client/src/format.ts`
- Responsibility: `usePolling`, `useAddToCart` (redirects visitors to login); `formatPrice` (cents), `formatDollars`, `formatDateTime`, `safeNextPath` (open-redirect guard).

## Header

- File: `client/src/components/Header.tsx`
- Responsibility: sticky site header with brand, search box, account links and cart count badge.

## Assistant Panel

- File: `client/src/components/Assistant.tsx`
- Responsibility: existing inline shopping assistant on the home page: text input (max 300), four example chips, `api.assistant` call, source and filter chips (`FilterChips`), relaxed-keyword note, empty state, results via `ProductGrid`. Local state only (message, result, error, busy); single result, no history. Fixed ids `assistant-title`, `assistant-input` and testids `assistant-*`.
- Depends on: API Client, Client Hooks and Formatting, Product Card.
- Used by: Home Page.

## Product Card

- File: `client/src/components/ProductCard.tsx`
- Responsibility: `ProductCard` (image, category, name, price, Add to cart or Out of stock) and `ProductGrid`.
- Depends on: Client Hooks and Formatting (`useAddToCart`, `formatPrice`).

## Status Badge

- File: `client/src/components/StatusBadge.tsx`
- Responsibility: colored order status pill.

## Home Page

- File: `client/src/pages/HomePage.tsx`
- Responsibility: hero, Assistant Panel, catalog search and category filter (URL params), product grid.

## Product Page

- File: `client/src/pages/ProductPage.tsx`
- Responsibility: product detail, quantity, Add to cart, Buy now.

## Auth Pages

- Files: `client/src/pages/LoginPage.tsx`, `client/src/pages/SignupPage.tsx`
- Responsibility: login and signup forms, redirect to safe `next` path.

## Cart Page

- File: `client/src/pages/CartPage.tsx`
- Responsibility: cart table, quantity change, remove, totals, go to checkout.

## Checkout Page

- File: `client/src/pages/CheckoutPage.tsx`
- Responsibility: shipping form, summary for cart or Buy now, place order.

## Order Pages

- Files: `client/src/pages/OrdersPage.tsx`, `client/src/pages/OrderDetailPage.tsx`
- Responsibility: My Orders list and order detail with timeline, cancel button, 5 s polling.

## Stylesheet

- File: `client/src/styles.css`
- Responsibility: all styling (CSS variables, buttons, header `z-index: 10`, grid, assistant and chip styles, tables, status pills).

## Test Suites

- Files: `tests/orders.test.ts`, `tests/e2e.test.ts`
- Responsibility: unit tests for lifecycle rules and assistant parser; API end-to-end, access control, oversell race, assistant rules path, persistence.
