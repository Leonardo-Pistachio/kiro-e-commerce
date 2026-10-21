# Code Generation Plan — Floating Chat Assistant Widget

## Summary

- Builds: a round bottom-right launcher that opens a chat panel recommending catalog products, on every page
- Touches: client/src/chat.ts (new), client/src/components/ChatWidget.tsx (new), client/src/App.tsx, client/src/styles.css, tests/chat.test.ts (new), README.md
- Tests: 1 new unit test file (about 6 tests) for the reply composition; existing 30 tests stay green

## Context

- Source: `inception/requirements-analysis/requirements.md` (FR1 to FR4, NFR1 to NFR5). Zero-Unit, brownfield, front end only, no server changes (NFR1).
- Reuses `api.assistant(message)` from `client/src/api.ts`, `ProductCard` styling ideas, `useAddToCart` from `client/src/hooks.ts`, `formatDollars` from `client/src/format.ts`.
- Layers that do not apply: data model, repository, API (no server change). Applicable layers: business logic (pure reply composition) and frontend behavior.

## Technical Decisions

- Pure module `client/src/chat.ts`: `EXAMPLE_PROMPTS`, `GREETING`, `MAX_RECOMMENDATIONS = 5`, `composeReply(result)` returning `{ text, products }` (count sentence, filter summary such as "Laptops, up to 1,500 dollars, keyword gaming", relaxed-keywords note, empty-result suggestion, products sliced to 5), and `errorReply(message)`. No DOM or React imports, so it runs in the existing node Vitest setup.
- Component `client/src/components/ChatWidget.tsx`: launcher `<button>` (circle, `aria-expanded`, `aria-controls`, label "Open shopping assistant" or "Close shopping assistant"); panel `role="dialog"` with heading, close button, thread `<ol aria-live="polite">`, typing indicator, input (maxLength 300) plus Send. Fresh state on each open (FR2.6). Escape closes; focus goes to the input on open and back to the launcher on close. Product rows: image, name, price, link to `/products/:id` (closes panel), Add to cart via `useAddToCart` (out-of-stock disabled). All ids and testids prefixed `chat-widget-` (FR4.2).
- Mounted once in `App.tsx` after `<main>`, so it appears on every route and sits inside the router and session providers.
- Styles appended to `client/src/styles.css`: fixed position bottom 24px right 24px, z-index 50 (above the header's 10), 56px circle, panel 360px by up to 70vh, full-width under 480px viewport, reduced-motion friendly.

## Testing Contract
```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c8f84e35190e007d9863fad236154d0269ab9bf633fc2a3ff106ed965ba4a9b9",
  "contract_sha256": "sha256:bb76c1b22f8307be6e5780d50cabab891684449d5b164bd0e825e9e4e5c61e5b"
}
```

## Steps

- [x] Step 1: Project structure. No new dependencies or configuration; confirm the files to add (`client/src/chat.ts`, `client/src/components/ChatWidget.tsx`, `tests/chat.test.ts`). Traces: NFR1, NFR3.
- [x] Step 2: Verify the existing test runner. Vitest (`vitest.config.ts`, node environment, `tests/**/*.test.ts`) already runs; record `npx vitest run tests/chat.test.ts` in `unit-test-instructions.md`. Traces: NFR5.
- [x] Step 3: Data model, repository and API layers: not applicable (no server change, NFR1).
- [x] Step 4: Business logic. Implement `client/src/chat.ts` (greeting, example prompts, `composeReply`, `errorReply`, max 5 products). Traces: FR2.2, FR3.2, FR3.3, FR3.6, FR3.7, FR3.8.
- [x] Step 5: Business logic tests. `tests/chat.test.ts`: reply for matches with category and price, filter summary wording, relaxed-keywords note, empty result suggestion, product list capped at 5, error reply, 3 or 4 example prompts. Run `npx vitest run tests/chat.test.ts`. Traces: FR2.2, FR3.2, FR3.3, FR3.6, FR3.7.
- [x] Step 6: Frontend behavior. Implement `client/src/components/ChatWidget.tsx`, mount it in `client/src/App.tsx`, add styles to `client/src/styles.css`. Leave `Assistant.tsx` unchanged. Traces: FR1.1 to FR1.3, FR2.1 to FR2.6, FR3.1, FR3.4, FR3.5, FR4.1, FR4.2, NFR2.
- [x] Step 7: Frontend tests: no client test harness exists (node-only Vitest); under the Minimal strategy the widget is checked by `npm run typecheck`, `npm run build` and a manual walkthrough. Re-run the existing suites `npx vitest run tests/orders.test.ts tests/e2e.test.ts` to confirm they stay green. Traces: NFR1, NFR4.
- [x] Step 8: Build configuration. Run `npm run typecheck` and `npm run build`; both must pass. Traces: NFR4.
- [x] Step 9: Documentation. Add a short "Chat assistant" section to `README.md` (where it is, what it does, demo steps).

## Requested Changes (person's review, 2026-10-21)

The person asked: "for the chatbox Shopping assistant, rename it as smart search and only do the searching. and for the button chatbox in the button right, make it as a interactive shopping assistant", choosing a real conversation with Bedrock replies and memory. Traces: requirements.md "Change Request" FR5.1 to FR5.6, NFR6.

- [x] Step 10: Smart search. In `client/src/components/Assistant.tsx` rename the visible title to "Smart search", reword helper text to search wording, keep behavior, ids and test ids unchanged so existing tests and the widget stay clash-free. Update any home-page references and README. Traces: FR5.1.
- [x] Step 11: Server business logic. In `server/assistant.ts` add `runChat(db, messages, config, fetchImpl)`: validate messages; with a key, call Bedrock Converse with the full conversation and a system prompt asking for ONLY a JSON object `{ "reply": string, "filters": {...} }` (reply up to about 400 characters, may ask a follow-up question, never invent products, filters optional); validate filters with `validateFilters`; on any failure fall back to `parseRules` over the latest user message merged with filters parsed from earlier user messages (latest wins per field) and a templated reply. Look products up with `findAssistantProducts`; when the model returned no filters, return no products. Keep the existing `runAssistant` unchanged. Traces: FR5.2 to FR5.5.
- [x] Step 12: Server tests and API. Add `POST /api/assistant/chat` in `server/app.ts` with input validation (1 to 20 messages, roles user or assistant, text 1 to 300 chars, last is user). Add `tests/assistant-chat.test.ts` (supertest, no Bedrock key, plus one test with an injected fake fetch returning a reply and filters, and one with invalid model output falling back): validation errors, rules fallback reply and products, multi-turn carry-over ("gaming laptop" then "under 1500" keeps Laptops plus max 1500), Bedrock reply passed through with catalog-only products. Run `npx vitest run tests/assistant-chat.test.ts`. Traces: FR5.3 to FR5.5, NFR6.
- [x] Step 13: Frontend. Add `api.assistantChat(messages)` and its types in `client/src/api.ts`; change `ChatWidget.tsx` to send the conversation so far and show the server `reply` plus up to 5 products; keep greeting, examples, typing indicator, error bubble, fresh-on-open, accessibility and `chat-widget-` ids. Update `client/src/chat.ts` and `tests/chat.test.ts` for any helper changes (for example building the message history and capping products). Traces: FR5.2, FR5.6.
- [x] Step 14: Verify and document. Run `npx vitest run tests/chat.test.ts tests/assistant-chat.test.ts tests/orders.test.ts tests/e2e.test.ts`, `npm run typecheck`, `npm run build`; update README (Smart search and interactive assistant). Traces: NFR4, NFR6.
