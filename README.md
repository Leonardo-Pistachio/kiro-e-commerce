# Kiro PC Store (proof of concept)

A small online PC store built in TypeScript for a live hackathon demo: catalog with search and category filter, sign up and log in, server-side cart, checkout with simulated payment, an automatic order lifecycle, My Orders, a shopping assistant (Amazon Bedrock with a rule-based fallback), and protection against overselling.

## Requirements

- Node.js 24 or newer (uses the built-in `node:sqlite`; no native modules to compile)
- npm 11

## Run it

```sh
npm install
npm start
```

`npm start` builds the React client into `dist/` and serves the app and the API at http://localhost:3001. Data is kept in `data/store.db`, created and seeded with 20 products on first start; it survives restarts. Delete that file to reset the store.

For development with hot reload, `npm run dev` runs the API (port 3001, `tsx watch`) and Vite (http://localhost:5173, proxying `/api`) together.

| Script | What it does |
|---|---|
| `npm start` | Build the client, then serve app and API on port 3001 |
| `npm run dev` | API plus Vite dev server with hot reload |
| `npm run build` | Build the client into `dist/` |
| `npm run typecheck` | Type-check server, client and tests |
| `npm test` | Run all tests |

## Configuration and the Bedrock key

Settings come from the environment. The server loads a `.env` file from the project root when it exists; `.env` is gitignored. Copy `.env.example` to `.env` and fill in only what you need:

- `AWS_BEARER_TOKEN_BEDROCK`: an Amazon Bedrock API key. When empty, the assistant uses the rule-based parser.
- `AWS_REGION`: Bedrock region (default `us-east-1`).
- `BEDROCK_MODEL_ID`: model or inference profile (default `us.amazon.nova-lite-v1:0`).
- `PORT` (default 3001), `DB_PATH` (default `data/store.db`).
- `ORDER_SHIP_SECONDS` (default 30) and `ORDER_DELIVER_SECONDS` (default 60).

The key is used only on the server, sent only in the `Authorization` header to Bedrock, and never logged or sent to the browser. The startup log says only whether a key is present.

## Demo script

1. Open http://localhost:3001. Browse the grid, type `gaming` in the search box, then pick **Laptops** in the category filter. Search for `toaster` to show the empty state.
2. In the **Smart search** box, search for `gaming laptop under 1500`. It shows which engine read the request (Amazon Bedrock or Rule-based) and the filters it applied; the products always come from the store's own catalog.
3. Click **Sign up** and create an account (the password is stored as a salted scrypt hash).
4. Open a product, set a quantity and click **Add to cart**. Add something from the grid too. The header shows the cart count.
5. Open **Cart**, change a quantity (capped at stock), remove a line, then **Checkout**.
6. Fill in the shipping form and place the order. Payment is simulated, so the order is created as **Paid** and you land on its details page.
7. **Cancel window**: within 30 seconds the order shows a **Cancel order** button; cancelling returns the stock. On another order, wait: the status turns **Shipped** at 30 s and **Delivered** at 60 s without reloading (pages refresh every 5 s). After it ships, the cancel button disappears and the server refuses a cancel.
8. **Buy now**: on a product page, click **Buy now** to check out that product directly without touching the cart.
9. **My Orders** lists your orders newest first with date, items, total and status.

Tip: for a faster demo, set `ORDER_SHIP_SECONDS=10` and `ORDER_DELIVER_SECONDS=20` in `.env`.

### Smart search and the shopping assistant

- **Smart search** (home page) only searches: one request in plain words becomes filters (category, price, keywords) plus the matching products, through `POST /api/assistant`.
- **Shopping assistant** (round button, bottom-right of every page) is a conversation. Each message is sent with the chat so far to `POST /api/assistant/chat`, so follow-ups such as `cheaper ones` or `under 1000` build on earlier turns. With a Bedrock key, Amazon Bedrock writes the reply and may ask a follow-up question when a request is vague; without a key, or when Bedrock fails, the rule-based parser reads the user turns (later turns win, keywords come from the latest one) and a templated reply is used. Products always come from the store database, at most 5 per reply. The chat starts fresh every time it opens.

1. On any page, click the round button (or Tab to it and press Enter). Focus moves to the message box.
2. Type `gaming laptop`, then `under 1500`: the second reply keeps Laptops and adds the budget.
3. Type something vague, such as `hi`, to get a follow-up question instead of products.
4. Click a product name to open its page (the panel closes), or click **Add to cart** (signed-out shoppers are sent to log in first).
5. Press Escape, click the close button, or click the round button again to close it; reopening starts a new chat.

The server side lives in `server/assistant.ts` (`runChat`) and is tested by `npx vitest run tests/assistant-chat.test.ts` with a fake Bedrock; the widget helpers live in `client/src/chat.ts` (`npx vitest run tests/chat.test.ts`).

### Showing the oversell protection

Every order is placed in one `BEGIN IMMEDIATE` SQLite transaction. Each line's stock is decremented with `UPDATE ... SET stock = stock - ? WHERE id = ? AND stock >= ?`; if any line affects no row, the whole order rolls back and the shopper sees which product is short.

- Automated: `npx vitest run tests/e2e.test.ts` includes a race where two shoppers order the last unit at the same time; exactly one succeeds and stock ends at 0.
- Live: find the Studio Workstation (only 2 in stock). Log in as two shoppers in two browsers (or a normal and a private window), put 2 in each cart, and check out in both. The second checkout gets "Not enough stock for: Studio Workstation (only 0 left). No order was placed."

## Tests

```sh
npx vitest run tests/orders.test.ts   # order lifecycle rules and assistant parser
npx vitest run tests/e2e.test.ts      # API end-to-end flow, access control, oversell race, persistence
npx vitest run tests/assistant-chat.test.ts  # chat endpoint: validation, rules fallback, carry-over, fake Bedrock
npx vitest run tests/chat.test.ts     # chat widget history and reply helpers
npm test                              # all of them
```

Tests run against in-memory databases and never call Bedrock (the chat tests inject a fake `fetch`), and pass fixed timestamps instead of waiting for the 30 and 60 second timers.

## Project layout

```
server/   Express API (app.ts), entry point (index.ts), SQLite schema (db.ts),
          seed data (seed.ts), queries (repo.ts), auth, orders, assistant
client/   React + Vite app (src/pages, src/components, public/images)
tests/    Vitest suites (orders.test.ts, e2e.test.ts, chat.test.ts, assistant-chat.test.ts)
```

## API overview

All responses are JSON. Errors look like `{ "error": { "code": "...", "message": "..." } }`. Cart and order routes need `Authorization: Bearer <session token>` and only ever touch the logged-in shopper's own data.

| Method and path | Purpose |
|---|---|
| `GET /api/products?q=&category=&minPrice=&maxPrice=` | Search and filter the catalog |
| `GET /api/products/:id`, `GET /api/categories` | Product detail, category list |
| `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Accounts and sessions |
| `GET /api/cart`, `POST /api/cart`, `PATCH /api/cart/:productId`, `DELETE /api/cart/:productId` | Cart |
| `POST /api/orders` (from the cart, or with `buyNow`) | Place an order |
| `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel` | My Orders, details, cancel |
| `POST /api/assistant` | Smart search (one request turned into filters plus matching products) |
| `POST /api/assistant/chat` | Interactive shopping assistant (conversation in, reply plus products out) |

## Known limits (proof of concept)

- Sessions are random tokens stored server-side and kept in the browser's localStorage; there is no rate limiting on login.
- The server listens on all interfaces of the laptop; run it on a trusted network.
- No admin tools, real payments, emails or password reset.
