# Requirements — Floating Chat Assistant Widget

Sources: the person's request ("create a chatbox ai assistant on the bottom right corner with a circle as a button, when clicked open a chat bot to recommend some products"), questions Q1 to Q5 in `requirements-analysis-questions.md`, and the code knowledge base at `aidlc/spaces/default/codekb/kiro-e-commerce/`.

## Intent Analysis

- Give shoppers a chat-style way to get product recommendations from any page, without scrolling to the home-page assistant panel.
- Reuse the existing assistant (`POST /api/assistant`: Bedrock with rule-based fallback, results only from the catalog). Type: enhancement, front end only. Complexity: simple.

## Functional Requirements

### FR1 Launcher button

- FR1.1 A round (circle) button shall be fixed to the bottom-right corner of every page, above all other content including the sticky header (request).
- FR1.2 Clicking the button shall open the chat panel; clicking it again, or a close button in the panel, or pressing Escape shall close it (request).
- FR1.3 The button shall have an accessible name ("Open shopping assistant" / "Close shopping assistant") and show its open state to assistive technology.

### FR2 Chat panel

- FR2.1 The panel shall open just above the launcher, anchored to the bottom-right corner, and fit small screens (full width on narrow viewports) (request).
- FR2.2 On open, the panel shall show a short greeting and 3 or 4 tappable example requests such as "Gaming laptop under 1500"; tapping one sends it as a message (Q2).
- FR2.3 The shopper shall type a message (1 to 300 characters) and send it with Enter or a Send button; empty messages cannot be sent.
- FR2.4 Messages shall appear as a chat thread: shopper messages on the right, assistant replies on the left, newest at the bottom, auto-scrolled into view.
- FR2.5 While a reply is pending, the panel shall show a typing indicator and disable sending.
- FR2.6 The conversation shall start fresh every time the panel is opened (Q4).

### FR3 Recommendations

- FR3.1 Each message shall be sent on its own to the existing `POST /api/assistant`; there is no conversation memory on the server (Q3).
- FR3.2 The assistant's reply text shall be composed in the browser from the response: how many products matched, and the filters applied (category, price range, keywords).
- FR3.3 Up to 5 recommended products shall be shown in the reply, each with image, name and price (request, Q5).
- FR3.4 Clicking a recommended product shall open its detail page (Q5).
- FR3.5 Each recommended product shall have an Add to cart button using the existing add-to-cart behavior, including the login redirect for signed-out shoppers and out-of-stock handling (Q5).
- FR3.6 When nothing matches, the reply shall say so and suggest trying a different request.
- FR3.7 When the request fails, the reply shall show a clear error message in the thread and the shopper can send again.
- FR3.8 Only products returned by the server (from the catalog) shall be shown (existing assistant rule).

### FR4 Coexistence with the existing panel

- FR4.1 The existing inline assistant panel on the home page shall stay as it is (Q1).
- FR4.2 The widget shall use its own element ids and `data-testid` values so it never clashes with the inline panel (codekb finding).

## Non-Functional Requirements

- NFR1 No server or API changes; existing tests stay green.
- NFR2 Accessibility: keyboard operable (Tab, Enter, Escape), focus moves into the panel on open and back to the button on close, the thread is announced as a live region, and every control has a label.
- NFR3 All TypeScript and React, matching the current client code and the single stylesheet.
- NFR4 `npm run typecheck` and `npm run build` pass.
- NFR5 Testing (Minimal strategy): one automated test per requirement area where practical, at minimum unit tests for the reply-text composition and existing suites green.

## Constraints

- C1 Front end only, inside `client/src/`, mounted in `App.tsx` so it appears on every route.
- C2 The assistant endpoint stays public and unthrottled (existing behavior); no new rate limit in this change.

## Assumptions

- A1 Showing up to 5 products per reply keeps the panel readable; the full list remains available via the home-page panel.
- A2 The chat uses a fixed greeting and fixed example requests; no server-side personalization.

## Out of Scope

- Conversation memory across messages (Q3).
- Keeping the chat across reloads or page changes (Q4).
- Server-side changes, new endpoints, or rate limiting.
- Removing or changing the existing home-page assistant panel (Q1).

## Open Questions

- None.

## Change Request (Code Generation review, 2026-10-21)

The person asked: "for the chatbox Shopping assistant, rename it as smart search and only do the searching. and for the button chatbox in the button right, make it as a interactive shopping assistant", and chose a real conversation (option 1). This supersedes FR3.1, FR3.2, the Q3 answer (independent messages) and NFR1 (no server changes).

- FR5.1 The home-page inline panel shall be renamed "Smart search" and only search: input, examples, applied-filter chips and the product grid, with no chat wording. Its behavior and the existing `POST /api/assistant` stay unchanged.
- FR5.2 The bottom-right widget shall be an interactive shopping assistant: the conversation so far (within the open panel) is sent with each message, so follow-ups such as "cheaper ones" or "with 32GB RAM" build on earlier turns.
- FR5.3 A new endpoint `POST /api/assistant/chat` shall take `{ messages: [{ role, text }] }` (1 to 20 messages, each 1 to 300 characters, last one from the user) and return `{ source, reply, filters, keywordsRelaxed, products }`.
- FR5.4 With a Bedrock key, the model shall return JSON with a natural-language `reply` and optional `filters`; it may ask a follow-up question when a request is vague. Filters are validated with the existing rules and products always come from the store database; the model never names products that are not in the returned list.
- FR5.5 Without a key, or on any Bedrock failure, the endpoint shall fall back to the rule-based parser over the latest message merged with filters from earlier user turns, with a templated reply.
- FR5.6 The widget shall show the server's reply text, up to 5 products, a typing indicator, errors in the thread, and still start fresh on every open (FR2.6 stays).
- NFR6 Existing tests stay green; new tests cover the chat endpoint (validation, rules fallback, multi-turn filter carry-over) without calling Bedrock.
