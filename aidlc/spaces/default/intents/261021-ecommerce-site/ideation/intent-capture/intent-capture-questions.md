# Intent Capture & Framing — Questions

## Sources

- [desc] Initial description: "Build a fully functional e-commerce website. The homepage displays a product catalog (image, name, price) with search and category filters. Clicking a product opens its detail page. After sign-up/login, users can add items to cart, adjust quantities, and checkout to place an order - or buy directly from the detail page.\nA \"My Orders\" page lists all orders with full details (items, amount, shipping info, status). Data must be persisted with pre-loaded products. Teams define their own order state logic (e.g., how cancellation affects inventory) and keep frontend and backend in sync. The full flow - Browse → Login → Add to Cart → Checkout →\nView Order — must be demo-ready.\nStretch Goals\nLLM Shopping Assistant: Convert natural language queries like \"camping gear under ·300\" into product filters — only recommend items that actually exist in the catalog.\nConcurrency-Safe Inventory: Prevent overselling when multiple users order the same item simultaneously."
- [scope] Workflow-selected scope: `mvp`.

## Q1. [Product owner] What is this website for?

The description reads like a build challenge with a demo at the end. Knowing whether it is a demo, a learning project or a real store changes how much polish and hardening it needs.

A. A hackathon or challenge entry, judged on a live demo
B. A learning or portfolio project
C. The first version of a real store that will sell to customers
D. An internal prototype to pitch an idea to stakeholders
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Product owner] Who is the shopper?

The answer sets the catalog's product themes and tone. The stretch-goal example ("camping gear") hints at an outdoor store, but that has not been confirmed.

A. A general consumer browsing a mixed catalog (electronics, home, outdoor, clothing, and so on)
B. Outdoor and camping enthusiasts (a niche specialty store)
C. A different niche I'll describe
D. Not yet defined: any sensible demo catalog is fine
X. Other (please specify)

[Answer]: X. personal computer

## Q3. [Product owner] How will you know the first version succeeded? (select all that apply)

These become the measurable success criteria the later stages check against.

A. The full flow (Browse, Login, Add to Cart, Checkout, View Order) runs end to end in a live demo with no errors
B. Orders and inventory stay correct after a restart (data is really persisted)
C. Two shoppers ordering the last unit at the same time never oversell it
D. The shopping assistant returns only products that exist in the catalog for natural-language queries
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Product owner] Which stretch goals are part of this first version?

The description lists two stretch goals. This decides whether they are in the plan from the start or left for later.

A. Both: the shopping assistant and concurrency-safe inventory
B. Only concurrency-safe inventory
C. Only the shopping assistant
D. Neither for now: core flow first, stretch goals only if time allows
E. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Product owner] What should happen to an order after it is placed?

The description leaves the order states to the team. This sets the lifecycle and how a cancellation affects stock.

A. Simple: Placed, then Cancelled by the shopper (stock returns to inventory); no shipping states
B. Standard: Pending, Paid, Shipped, Delivered, plus Cancelled (shopper can cancel only before Shipped; stock returns on cancel)
C. Standard lifecycle advanced automatically over time for the demo (no admin needed)
D. Standard lifecycle with a simple admin view to move orders between states
E. Not yet defined: propose something sensible
X. Other (please specify)

[Answer]: B

## Q6. [Product owner] How is payment handled at checkout?

Real payment needs a provider account and extra security work. A simulated step keeps the demo self-contained.

A. Simulated payment (no real charge; the order is marked paid immediately)
B. No payment step at all; placing the order is enough
C. A real payment provider in test mode (for example Stripe test keys)
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q7. [Product owner] What is out of this first version? (select all that apply)

The mvp plan is already chosen. This only asks what the product itself should leave out for now.

A. Admin tools for managing products (the catalog is pre-loaded only)
B. Product reviews and ratings
C. Real email notifications (order confirmation emails)
D. Password reset, social login, or multi-factor sign-in
E. None: nothing specific is excluded yet
X. Other (please specify)

[Answer]: A, C

## Q8. [Product owner] Who else has a say in this work, and how should progress be shared?

This fills in the stakeholder map. If it's just you, that's a complete answer.

A. Just me: I decide scope and priorities, and no separate reporting is needed
B. Me plus a small team; we agree on scope together and share progress informally
C. Judges or reviewers evaluate the final demo; I decide scope
D. A manager or client signs off on scope and expects regular progress updates
E. Not identified
X. Other (please specify)

[Answer]: A

## Q9. [Product owner] How does an order move from Paid to Shipped and Delivered?

You picked the standard lifecycle and simulated payment, so a new order becomes Paid right away. Nothing yet moves it on to Shipped or Delivered, and product admin tools are out of this version.

A. Automatically over time for the demo (for example Shipped after a minute, Delivered a minute later)
B. A small order-only admin view to move orders forward (separate from the excluded product admin tools)
C. A demo button on the order itself that advances it to the next state
D. They stay Paid in this version; Shipped and Delivered exist but nothing triggers them yet
E. Not yet defined: propose something sensible
X. Other (please specify)

[Answer]: A. deliver everything in 1 min

## Consolidated Summary Confirmation

Summary of answers:

- Purpose: a hackathon or challenge entry, judged on a live demo (Q1)
- Shopper and catalog: a store selling personal computers (Q2)
- Success: the full flow (Browse, Login, Add to Cart, Checkout, View Order) runs end to end in a live demo with no errors (Q3)
- Stretch goals in this version: both the LLM shopping assistant and concurrency-safe inventory (Q4)
- Order lifecycle: Pending, Paid, Shipped, Delivered, plus Cancelled; the shopper can cancel only before Shipped, and cancelling returns stock to inventory (Q5)
- Payment: simulated, no real charge; the order is marked Paid immediately (Q6)
- Out of this version: admin tools for managing products (catalog is pre-loaded only) and real email notifications (Q7)
- Stakeholders: just you; you decide scope and priorities, no separate reporting (Q8)
- Order progression: automatic for the demo; an order goes all the way to Delivered within 1 minute of being placed (Q9)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
