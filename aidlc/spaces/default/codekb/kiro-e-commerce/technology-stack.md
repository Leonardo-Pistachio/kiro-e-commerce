# Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Language | TypeScript | 5.9.3 | One `tsconfig.json`, `strict`, `noEmit`, target ES2023, module ESNext, bundler resolution, `react-jsx` |
| Runtime | Node.js | 24 or newer (`engines`) | Needed for built-in `node:sqlite` and `process.loadEnvFile` |
| Package manager | npm | 11 | `.npmrc`: `save-exact=true`, `legacy-peer-deps=true` |
| Server framework | Express | 5.2.1 | Async errors forwarded to error middleware |
| Database | SQLite via `node:sqlite` `DatabaseSync` | built in | WAL, foreign keys, busy timeout 5000 ms |
| Password hashing | `node:crypto` scrypt | built in | 64-byte key, 16-byte salt |
| Server runner | tsx | 4.23.15 | `tsx server/index.ts`, `tsx watch` in dev |
| UI library | React / React DOM | 18.3.1 | StrictMode, function components and hooks |
| Routing | react-router-dom | 7.18.4 | `BrowserRouter`, `Routes`, `useSearchParams` |
| Bundler / dev server | Vite | 6.4.5 | With `@vitejs/plugin-react` 4.7.0; root `client`, out `dist`, port 5173 |
| Styling | Plain CSS | n/a | Single global `styles.css`, CSS variables |
| Test runner | Vitest | 4.1.11 | Node environment, `tests/**/*.test.ts` |
| HTTP test client | supertest | 7.3.1 | Against `createApp`, no port |
| Dev orchestration | concurrently | 9.2.5 | `npm run dev` |
| AI service | Amazon Bedrock Runtime Converse API | n/a | Bearer API key; default model `us.amazon.nova-lite-v1:0`; region default `us-east-1`; plain `fetch`, no AWS SDK |

Type packages: `@types/express` 5.0.6, `@types/node` 24.19.2, `@types/react` 18.3.31, `@types/react-dom` 18.3.7, `@types/supertest` 6.0.3.

Not present: linter, formatter config, CSS framework, state library, client test environment (jsdom), Docker, IaC, CI.

Full dependency relationships: `dependencies.md`.
