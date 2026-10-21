# Code Quality Assessment

## Test Coverage

- Framework: Vitest 4 in node environment with supertest; in-memory SQLite; Bedrock key forced empty; fixed clocks instead of timers.
- `tests/orders.test.ts`: status derivation, cancel rules and stock return, rule-based parser, `validateFilters` rejection of malformed model output.
- `tests/e2e.test.ts`: browse and search, product detail, auth (signup, duplicate, wrong password, hashed storage, logout), cart limits, checkout validation, order views, lifecycle and cancel window, Buy now, cross-user isolation, oversell race, partial-cart rollback, assistant rules path and blank message, persistence across reopen (writes a temp file under `data/` and removes it).
- Gaps: no client or component tests (no jsdom or Testing Library); Bedrock success and timeout paths untested though `fetchImpl` is injectable; no coverage configuration or threshold.

## Linting and Formatting

- No ESLint or Prettier configuration. Static checking is `npm run typecheck` (`tsc --noEmit`, strict, unused locals and parameters as errors).

## CI/CD

- None found. No pipeline, Dockerfile or deployment config. `npm start` builds and serves locally.

## Documentation Quality

- README: good (setup, configuration, demo script, API overview, known limits).
- Code comments: short module-level intent comments and JSDoc on key functions; security-relevant choices explained inline (key handling, LIKE escaping, transactions).

## Quick Ratings

| Aspect | Rating | Note |
|---|---|---|
| Naming clarity | good | Descriptive function and variable names |
| Function size | good | Most functions small; `askBedrock` and `createApp` longer but linear |
| Error handling | good | Central `AppError` envelope; I/O wrapped; Bedrock failures fall back |
| Test presence | fair | Server well covered, client not at all |
| Duplication | fair | See debt list |
| Dead code | good | Only `GET /api/categories` / `api.categories()` unused by the UI |

## Technical Debt

- Category list duplicated in `server/seed.ts`, `server/db.ts` CHECK constraint, `client/src/api.ts` type and `client/src/pages/HomePage.tsx`; client types hand-mirror server types.
- `STOP_WORDS` in `server/assistant.ts` contains `under` twice (no effect).
- No rate limiting on `POST /api/assistant` (public, may call paid Bedrock) or on login.
- Server listens on all interfaces (README known limit).
- Session token in `localStorage` (README known limit).
- Single global stylesheet; adding overlay UI must avoid class collisions and respect the sticky header `z-index: 10`.
- No TODO, FIXME, HACK or linter suppressions found.

## Notes for the Chat Widget Intent

- `Assistant.tsx` hard-codes element ids and testids; a second instance on the same page would duplicate ids, which hurts accessibility and test selectors.
- Accessibility patterns to keep: labelled inputs (`visually-hidden`), `role="alert"` for errors, `aria-labelledby` on sections, visible focus outline in `styles.css`.
