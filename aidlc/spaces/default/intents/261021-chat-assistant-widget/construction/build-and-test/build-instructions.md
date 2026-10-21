# Build Instructions — Smart Search and Interactive Shopping Assistant

## Prerequisites

- Node.js 24+ and npm 11, as for the store. No new dependencies in this change.

## Dependency Installation

- `npm install` from the project root.

## Environment Setup

- Optional `.env` with `AWS_BEARER_TOKEN_BEDROCK` and `AWS_REGION` (see `.env.example`). With a key, the bottom-right assistant writes replies through Bedrock; without one, or if the key has expired, it uses the rule-based replies. Smart search works either way.

## Build Commands

- Type check: `npm run typecheck`
- Client bundle: `npm run build` (writes `dist/`)
- Demo: `npm start`, then open http://localhost:3001

## Build Verification

- `npm run typecheck` exits 0; `npm run build` prints `built in ...`.
- The round button shows in the bottom-right corner of every page; the home page shows the "Smart search" panel.
- `POST /api/assistant/chat` with `{"messages":[{"role":"user","text":"gaming laptop"}]}` returns `reply`, `filters` and up to 5 `products`.

## Troubleshooting

- Assistant replies sound templated: no key, or the key expired; check the server log for "Bedrock chat unavailable".
- 400 `VALIDATION_FAILED` from the chat endpoint: more than 20 messages, a message over 300 characters, or the last message is not from the user.
