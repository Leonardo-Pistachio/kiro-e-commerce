# Test Results — Build and Test

Run on 2026-10-21, macOS, Node v24.14.0.

## Build Status

- `npm run typecheck`: success, exit 0.
- `npm run build`: success. `dist/index.html` 0.74 kB, CSS 18.82 kB, JS 221.30 kB, built in 542 ms.

## Test Results

- `npx vitest run tests/chat.test.ts tests/assistant-chat.test.ts tests/orders.test.ts tests/e2e.test.ts` (deduplicated stage-level commands, run once): 4 files, 64 tests, 64 passed, 0 failed, 0 skipped (chat 9, assistant-chat 25, orders 11, e2e 19).
- Coverage report: not collected (express scope, Minimal strategy, no coverage floor).

## Other Checks

- Secret check: no Bedrock key or variable name found in `dist/`.
- Live smoke run during Code Generation (temporary database, removed afterwards): Bedrock asked a follow-up for "I need a computer"; "gaming laptop" then "cheaper ones, under 1500" returned Laptops, max 1500, keyword gaming, and a catalog laptop.
- Traceability: 31 of 31 IDs covered (3 marked N/A as superseded by the person's change request).

## Failure Details

- None.
