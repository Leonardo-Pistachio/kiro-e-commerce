# Reverse Engineering Timestamp

## Run Record

- Date: 2026-10-21
- Commit: unknown

Full first scan of the whole repository (no prior store). Left out unopened: `node_modules/`, `dist/`, `data/`, `.env`, and AI-DLC's own install and workspace. Fingerprint is `unknown` because the workspace is not a git repository.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: chat-assistant-widget
fingerprint: unknown
analyzed:
  paths:
    - ./
  components:
    - Server Entry
    - Server Config
    - API Router
    - Auth Service
    - Order Service
    - Shopping Assistant Service
    - Data Access
    - Database
    - Seed Catalog
    - Error Model
    - Client Bootstrap and Routes
    - API Client
    - Session Store
    - Client Hooks and Formatting
    - Header
    - Assistant Panel
    - Product Card
    - Status Badge
    - Home Page
    - Product Page
    - Auth Pages
    - Cart Page
    - Checkout Page
    - Order Pages
    - Stylesheet
    - Test Suites
shallow:
  paths:
    - client/public/images/
    - package-lock.json
```
