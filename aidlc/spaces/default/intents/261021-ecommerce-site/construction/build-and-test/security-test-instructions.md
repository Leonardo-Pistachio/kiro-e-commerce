# Security Test Instructions

## Scope

- Minimal test strategy: no SAST or DAST tooling. The security baseline (NFR4, NFR5) is checked by the end-to-end suite and two manual checks.

## Automated

- `npx vitest run tests/e2e.test.ts` covers: cart and order routes refuse requests without a session; another shopper's order returns 404; duplicate sign-up and wrong password are refused.

## Manual

- Secret not in the bundle: after `npm run build`, `grep -r "AWS_BEARER_TOKEN_BEDROCK\|bedrock-api-key" dist/` finds nothing.
- Dependency audit: `npm audit` reports 0 vulnerabilities.

## Known Gaps (accepted for the proof of concept)

- No login rate limiting; the server listens on all network interfaces. Run the demo on a trusted network.
