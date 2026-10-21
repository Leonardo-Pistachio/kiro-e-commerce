# API Documentation

## Conventions

- Base path `/api`, JSON in and out, request body limit 50 kb.
- Auth: `Authorization: Bearer <session token>` on routes marked Auth; missing or expired token gives 401 `UNAUTHORIZED`.
- Error envelope: `{ "error": { "code", "message", "details"? } }`. Codes: `VALIDATION_FAILED` 400, `INVALID_JSON` 400, `UNAUTHORIZED` 401, `INVALID_CREDENTIALS` 401, `NOT_FOUND` 404, `EMAIL_TAKEN` / `OUT_OF_STOCK` / `INSUFFICIENT_STOCK` / `CANNOT_CANCEL` 409, `TOO_LARGE` 413, `INTERNAL` 500.
- Headers on every response: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; `/api` adds `Cache-Control: no-store`.
- No rate limiting on any route. Unknown `/api` paths return 404 `NOT_FOUND`.

## REST Endpoints (`server/app.ts`)

| Method and path | Auth | Request | Success response |
|---|---|---|---|
| GET `/api/health` | no | none | `{ ok: true }` |
| GET `/api/categories` | no | none | `{ categories }` |
| GET `/api/products` | no | query `q` (max 100), `category`, `minPrice`, `maxPrice` (dollars) | `{ products: Product[] }` ordered by category, price |
| GET `/api/products/:id` | no | path id | `{ product }` or 404 |
| POST `/api/auth/signup` | no | `{ email, name, password }` (password 8 to 200) | 201 `{ token, user }` |
| POST `/api/auth/login` | no | `{ email, password }` | `{ token, user }` |
| POST `/api/auth/logout` | yes | none | 204 |
| GET `/api/auth/me` | yes | none | `{ user }` |
| GET `/api/cart` | yes | none | `Cart` |
| POST `/api/cart` | yes | `{ productId, quantity? = 1 }` adds to existing quantity | 201 `Cart` |
| PATCH `/api/cart/:productId` | yes | `{ quantity }` | `Cart` |
| DELETE `/api/cart/:productId` | yes | none | `Cart` |
| POST `/api/orders` | yes | `{ shipping, buyNow?: { productId, quantity? } }` | 201 `{ order: OrderView }` |
| GET `/api/orders` | yes | none | `{ orders: OrderView[] }` newest first |
| GET `/api/orders/:id` | yes | path id (own orders only, else 404) | `{ order }` |
| POST `/api/orders/:id/cancel` | yes | none | `{ order }` or 409 `CANNOT_CANCEL` |
| POST `/api/assistant` | no | `{ message }` | `AssistantResult` |

Shapes: `Product { id, name, description, category, priceCents, stock, image }`; `Cart { items: CartLine[], count, totalCents }` with `CartLine { productId, name, image, priceCents, stock, quantity, lineTotalCents }`; `OrderView { id, status, totalCents, placedAt, shipsAt, deliversAt (ISO), canCancel, shipping, items[] }`; `ShippingInfo { recipientName, address, city, postalCode, phone }`.

## Shopping Assistant Contract (`POST /api/assistant`)

- Public, no auth. Body `{ "message": string }`, must be a non-blank string of at most 300 characters (checked before trim), else 400 `VALIDATION_FAILED` with "Tell the assistant what you are looking for (up to 300 characters).".
- Response 200:

```json
{
  "source": "bedrock | rules",
  "filters": { "category": "Laptops", "minPrice": 0, "maxPrice": 1500, "keywords": ["gaming"] },
  "keywordsRelaxed": false,
  "products": [ { "id": 2, "name": "...", "priceCents": 139900, "...": "..." } ]
}
```

- `filters` fields are all optional; prices in dollars; up to 5 lowercase keywords.
- `keywordsRelaxed: true` means no product matched the keywords, so they were dropped and other filters kept.
- No reply text, no session or history, no product limit (all matches returned). Stateless: each call is independent.
- Existing test expectations (`tests/e2e.test.ts`): rules path for "gaming laptop under 1500" returns `source: 'rules'` and `filters` exactly `{ category: 'Laptops', maxPrice: 1500, keywords: ['gaming'] }`; blank message is 400. Any contract extension should be additive.

## Outbound API: Amazon Bedrock Converse (`server/assistant.ts` `askBedrock`)

- `POST https://bedrock-runtime.<AWS_REGION>.amazonaws.com/model/<encoded BEDROCK_MODEL_ID>/converse`
- Headers: `Content-Type: application/json`, `Authorization: Bearer <AWS_BEARER_TOKEN_BEDROCK>`
- Body: `system` prompt (filters-only JSON instruction), one user message, `inferenceConfig { maxTokens: 200, temperature: 0 }`
- Region validated against a pattern; 8000 ms abort timeout; any non-OK status, missing text or invalid JSON throws and triggers the rule-based fallback (warning logged without the key).

## Internal Client API (`client/src/api.ts`)

`api.products`, `product`, `categories`, `signup`, `login`, `logout`, `me`, `cart`, `addToCart`, `updateCartLine`, `removeCartLine`, `placeOrder`, `orders`, `order`, `cancelOrder`, `assistant(message)`. All go through `request`, which adds the bearer token, maps network failure to `ApiError(0, 'NETWORK')`, maps the error envelope to `ApiError`, and calls the unauthorized handler on 401 when a token was set.
