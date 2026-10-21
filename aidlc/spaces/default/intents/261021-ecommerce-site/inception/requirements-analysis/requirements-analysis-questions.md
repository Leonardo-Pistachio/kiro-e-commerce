# Requirements Analysis — Questions

Context already settled: PC store, hackathon demo run locally, all TypeScript, 2-hour proof of concept, simulated payment, standard order lifecycle with automatic progression to Delivered within 1 minute, cancel only before Shipped (stock returns), both stretch goals in, no product admin or emails.

## Q1. [Product owner] What should the pre-loaded PC catalog look like?

This sets the category filters, the demo data and the currency shown on prices.

A. About 20 products across 4 categories (Laptops, Desktops, Monitors, Accessories), prices in US dollars
B. About 20 products across 4 categories (Laptops, Desktops, Monitors, Accessories), prices in Chinese yuan
C. About 40 products across 6 categories (Laptops, Desktops, Monitors, Components, Peripherals, Accessories), prices in US dollars
D. Not yet defined: pick something sensible
X. Other (please specify)

[Answer]: A

## Q2. [Developer] Which AI model service can the shopping assistant use?

The assistant turns requests like "gaming laptop under 1500" into filters. It needs a language model, which means an API key and network access during the demo.

A. A hosted model service with my API key (for example OpenAI or Anthropic), plus a keyword-matching fallback if the key is missing
B. Amazon Bedrock with my AWS credentials, plus a keyword-matching fallback
C. No model for now: a rule-based parser (price, category and keywords) that works offline
D. Not yet defined
X. Other (please specify)

[Answer]: D

## Q3. [Product owner] When does an order reach Shipped inside the 1-minute window?

Shoppers can cancel only before Shipped, so this decides how long you have to show a cancellation in the demo.

A. Paid at once, Shipped at 30 seconds, Delivered at 60 seconds
B. Paid at once, Shipped at 45 seconds, Delivered at 60 seconds
C. Same as A, but the timings are configurable so I can slow them down during the demo
D. Not yet defined: choose something that makes cancellation easy to demo
X. Other (please specify)

[Answer]: A

## Q4. [Developer] How much testing fits the 2-hour build?

The poc plan uses a minimal test strategy. This decides what is checked automatically.

A. A few automated tests on the risky parts only: overselling protection and order state rules
B. One automated end-to-end check of the full flow (Browse, Login, Add to Cart, Checkout, View Order)
C. Both A and B
D. No automated tests: I'll check by hand in the demo
X. Other (please specify)

[Answer]: B

## Q5. [Developer] With no model service decided, how should the shopping assistant work?

The assistant is in scope (a stretch goal you kept), but no model service is chosen yet (Q2). It still has to work during the demo.

A. Use a hosted model if an API key is set in the environment; otherwise fall back to a built-in rule-based parser, so the demo works either way
B. Built-in rule-based parser only (price, category and keywords), fully offline
C. Drop the shopping assistant from this proof of concept
X. Other (please specify)

[Answer]: A. Model service: Amazon Bedrock (API key supplied by the person, kept only in the local gitignored .env file, never in this record)

## Consolidated Summary Confirmation

Summary of answers:

- Catalog: about 20 pre-loaded PCs across 4 categories (Laptops, Desktops, Monitors, Accessories), prices in US dollars (Q1)
- Shopping assistant: uses Amazon Bedrock when its key is set in the environment, otherwise falls back to a built-in rule-based parser (price, category, keywords), and only recommends catalog products (Q2, Q5)
- Order timing: Paid at once, Shipped at 30 seconds, Delivered at 60 seconds; cancel is possible only before Shipped and returns stock (Q3)
- Testing: one automated end-to-end check of the full flow (Browse, Login, Add to Cart, Checkout, View Order) (Q4)
- Carried forward: PC store hackathon demo run locally, all TypeScript, 2-hour proof of concept, simulated payment, overselling protection, no product admin or emails

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
