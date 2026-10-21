# Security Test Instructions

## Scope

- Minimal test strategy; checks focus on the new public chat endpoint and the Bedrock key.

## Automated

- `npx vitest run tests/assistant-chat.test.ts`: rejects malformed input (wrong roles, blank or over-long text, more than 20 messages, last turn not from the user); the fallback warning log never contains the key; products always come from the database.

## Manual

- Key not in the bundle: after `npm run build`, `grep -r "AWS_BEARER_TOKEN_BEDROCK\|bedrock-api-key" dist/` finds nothing.

## Known Gaps (accepted for this proof of concept)

- `POST /api/assistant/chat`, like `POST /api/assistant`, is public and not rate limited; each call can make a paid Bedrock request.
- Prompt injection: a shopper can steer the model's reply text, but filters are validated and products always come from the catalog.
