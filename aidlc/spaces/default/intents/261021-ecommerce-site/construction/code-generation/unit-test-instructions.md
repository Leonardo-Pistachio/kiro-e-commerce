# Unit Test Instructions — PC E-Commerce Store (Proof of Concept)

## Framework and Setup

- Runner: Vitest (node environment), configured in `vitest.config.ts` to pick up `tests/**/*.test.ts`.
- HTTP testing: `supertest` against the Express app built by `createApp()` from `server/app.ts`; no network port is opened.
- Install once from the project root: `npm install`.

## How to Run This Work's Tests

Zero-Unit build, so these commands cover the whole proof of concept, scoped to exact test files:

- Order rules and assistant parser: `npx vitest run tests/orders.test.ts`
- API end-to-end flow and oversell race: `npx vitest run tests/e2e.test.ts`
- Both, as Build and Test runs them: `npx vitest run tests/orders.test.ts tests/e2e.test.ts`

The runner is ready before the first test step: Step 2 of the plan installs Vitest and writes `vitest.config.ts`, so `npx vitest run tests/orders.test.ts` is runnable from Step 8 onward.

## Expected Coverage

- Minimal strategy, poc scope: no line-coverage floor.
- Requirement-driven: each tested requirement has at least one test (FR1 to FR6 and FR8 through the end-to-end suite; FR5 rules and the FR7 fallback parser through `tests/orders.test.ts`).
- Happy path plus at least two error or edge cases: unauthenticated cart access is refused, another shopper's order is refused, cancel after Shipped is refused, and the last-unit race lets exactly one order through.

## Mocking and Stubbing

- No Bedrock calls in tests: tests run with `AWS_BEARER_TOKEN_BEDROCK` unset, so the assistant uses the rule-based parser.
- Time: order status functions take `now` as a parameter, so tests pass fixed timestamps instead of waiting 30 or 60 seconds.

## Test Data

- Each test file opens a fresh in-memory database (`DB_PATH=:memory:`) and runs the same seed as production (20 products).
- Tests create their own users with unique emails; nothing is shared between files.
- For the oversell race, the test sets one product's stock to 1 before placing two orders at the same time.
