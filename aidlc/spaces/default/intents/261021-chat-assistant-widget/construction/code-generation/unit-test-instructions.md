# Unit Test Instructions — Floating Chat Assistant Widget

## Framework and Setup

- Existing runner: Vitest, node environment, `vitest.config.ts` picks up `tests/**/*.test.ts`. No new dependencies.
- The tested module `client/src/chat.ts` is pure TypeScript with no DOM or React imports, so it runs in the node environment.

## How to Run This Work's Tests

- New tests: `npx vitest run tests/chat.test.ts`
- Chat endpoint (requested change): `npx vitest run tests/assistant-chat.test.ts`
- Existing suites stay green: `npx vitest run tests/orders.test.ts tests/e2e.test.ts`

The runner already exists, so `npx vitest run tests/chat.test.ts` is runnable as soon as the test file is written (Step 5).

## Expected Coverage

- Minimal strategy, express scope: no line-coverage floor. One test per testable requirement in `chat.ts`, covering the happy path plus at least two edge cases (empty result, error reply, more than 5 products).

## Mocking and Stubbing

- `tests/chat.test.ts`: none needed; helpers take plain objects built inline.
- `tests/assistant-chat.test.ts`: Bedrock is never called. Bedrock-path tests inject a fake `fetchImpl` into `createApp` that returns canned Converse responses; rules-path tests run with no key.

## Test Data

- Inline fixture products (id, name, category, priceCents, stock, image) built per test; nothing shared between tests.
