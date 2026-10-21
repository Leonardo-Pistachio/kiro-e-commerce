# Integration Test Instructions

## Scope

- Minimal test strategy: no separate integration suite. The chat endpoint's server boundaries (HTTP route, validation, SQLite lookup, Bedrock call through an injected fake fetch) are covered in-process by `tests/assistant-chat.test.ts`.

## How to Run

- `npx vitest run tests/assistant-chat.test.ts`

## Live Bedrock Check (manual)

- With a key in `.env`, start the app and post a two-turn conversation, for example "gaming laptop" then "cheaper ones, under 1500". Pass: `source` is `bedrock`, filters keep Laptops and add maxPrice 1500, and every product is from the catalog.
