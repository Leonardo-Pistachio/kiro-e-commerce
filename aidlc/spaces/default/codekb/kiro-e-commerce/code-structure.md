# Code Structure

## Layout

```
./
  package.json, package-lock.json, .npmrc     npm config (exact pins)
  tsconfig.json                               one strict config for server, client, tests
  vite.config.ts                              client root, dist output, /api proxy
  vitest.config.ts                            server-side tests, env overrides
  .env.example                                documented env vars
  README.md
  server/                                     Express API (10 files)
  client/
    index.html                                SPA shell, #root
    public/images/                            4 category SVGs
    src/
      main.tsx, App.tsx                       bootstrap and routes
      api.ts, session.tsx, hooks.ts, format.ts
      styles.css                              single global stylesheet
      components/                             Header, Assistant, ProductCard (+ProductGrid), StatusBadge
      pages/                                  Home, Product, Login, Signup, Cart, Checkout, Orders, OrderDetail
  tests/                                      orders.test.ts, e2e.test.ts
```

Generated or local folders `node_modules/`, `dist/`, `data/` are gitignored and not part of the source.

## File Classification

| Category | Files |
|---|---|
| Controller/Handler | `server/app.ts` |
| Service/UseCase | `server/orders.ts`, `server/auth.ts`, `server/assistant.ts` |
| Repository/DAO | `server/repo.ts` |
| Model/Entity and Migration | `server/db.ts` (schema created idempotently, no migration tool), types in `server/repo.ts` |
| Configuration | `server/config.ts`, `server/index.ts`, root config files |
| Utility/Helper | `server/errors.ts`, `client/src/format.ts`, `client/src/hooks.ts` |
| Seed data | `server/seed.ts` |
| Client state and transport | `client/src/session.tsx`, `client/src/api.ts` |
| UI components | `client/src/components/*.tsx`, `client/src/pages/*.tsx`, `client/src/App.tsx`, `client/src/main.tsx` |
| Static/Asset | `client/index.html`, `client/src/styles.css`, `client/public/images/*.svg` |
| Test | `tests/orders.test.ts`, `tests/e2e.test.ts` |

## Code Patterns

- Functions take `db: Db` as the first argument; no classes except `AppError` and `ApiError`.
- Row mappers (`toProduct`, `toUser`, `toOrder`) convert snake_case columns to camelCase types.
- Validation helpers throw `AppError` factories (`badRequest`, `notFound`, `conflict`, `unauthorized`); Express 5 forwards async throws to the error middleware.
- Money is integer cents everywhere except assistant filters, which are dollars and converted in `toProductFilters`.
- Injectable time and fetch (`now`, `fetchImpl`) for deterministic tests.
- Client components keep local `useState` for `busy`, `error`, result; errors shown with `role="alert"`, success with `role="status"`.
- Every interactive element has a `data-testid`; labels use the `visually-hidden` class.
- Async effects guard against stale updates with an `isCurrent` flag.

## Where the Chat Widget Fits

- Global mount point: `client/src/App.tsx` (inside `BrowserRouter` and `SessionProvider` from `main.tsx`), alongside `Header` and `main`.
- Reusable pieces: `api.assistant`, `AssistantResult` type, `ProductGrid` / `ProductCard`, `formatDollars`, chip styles in `styles.css`.
- Existing inline panel: `client/src/components/Assistant.tsx`, rendered by `client/src/pages/HomePage.tsx`.
