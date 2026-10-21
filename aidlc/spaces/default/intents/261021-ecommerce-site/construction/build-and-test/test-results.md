# Test Results — Build and Test

Run on 2026-10-21, macOS, Node v24.14.0, npm 11.5.1.

## Build Status

- `npm run build`: success. `dist/index.html` 0.47 kB, CSS 7.36 kB, JS 211.73 kB, built in 675 ms.
- `npm run typecheck`: success, exit 0, no diagnostics.

## Test Results

- `npx vitest run tests/orders.test.ts tests/e2e.test.ts` (deduplicated stage-level command, run once): 2 files, 30 tests, 30 passed, 0 failed, 0 skipped.
  - `tests/orders.test.ts`: 11 passed.
  - `tests/e2e.test.ts`: 19 passed (includes the full Browse, Login, Add to Cart, Checkout, View Order flow and the last-unit race).
- Coverage report: not collected (poc scope, Minimal strategy, no coverage floor).

## Other Checks

- Smoke run (`PORT=3999 DB_PATH=data/smoke.db npx tsx server/index.ts`, removed afterwards): seeded 20 products; `GET /api/products` 200 in 0.006 s; search with category 200 in 0.001 s; `GET /` 200 in 0.004 s.
- Live Bedrock assistant: `POST /api/assistant` with "gaming laptop under 1500" returned 200 in 1.41 s, `source: bedrock`, filters category Laptops, maxPrice 1500, keywords gaming, 1 catalog product.
- Secret check: no Bedrock key or variable name found in `dist/`.
- `npm audit`: 0 vulnerabilities.

## Failure Details

- None.
