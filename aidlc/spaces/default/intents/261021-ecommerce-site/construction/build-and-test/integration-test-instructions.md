# Integration Test Instructions

## Scope

- Minimal test strategy: no separate integration suite is generated. Single-process app with no cross-unit boundaries.
- The API end-to-end suite already exercises every server boundary in-process (HTTP routes, auth, SQLite).

## How to Run

- `npx vitest run tests/e2e.test.ts` (supertest against `createApp()` on an in-memory database).

## External Dependency Check

- Bedrock is not called in tests. Manual check: with a key in `.env`, start the app and `POST /api/assistant` with `{"message":"gaming laptop under 1500"}`; the response says `"source":"bedrock"`.
