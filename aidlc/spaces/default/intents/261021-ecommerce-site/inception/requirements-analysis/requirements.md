# Requirements — PC E-Commerce Store (Proof of Concept)

Sources: intent statement (`ideation/intent-capture/intent-statement.md`), Intent Capture questions IC-Q1..IC-Q9, Feasibility questions FE-Q1..FE-Q8, Requirements Analysis questions RA-Q1..RA-Q5.

## Intent Analysis

- Goal: a working online PC store, built as a 2-hour proof of concept and shown in a live hackathon demo running locally (IC-Q1, IC-Q2, FE-Q1, FE-Q2).
- The demo must run the full flow end to end with no errors: Browse, Login, Add to Cart, Checkout, View Order (IC-Q3).
- Both stretch goals are in: an AI shopping assistant and protection against overselling (IC-Q4).
- Depth: Minimal; test strategy: Minimal (poc plan, FE-Q8).

## Functional Requirements

### FR1 Product catalog and browsing

- FR1.1 The system shall pre-load about 20 personal-computer products across 4 categories: Laptops, Desktops, Monitors, Accessories (RA-Q1).
- FR1.2 The homepage shall list products, showing each product's image, name and price in US dollars (RA-Q1, desc).
- FR1.3 The homepage shall offer a text search that matches product names and descriptions (desc).
- FR1.4 The homepage shall offer a category filter; search and category filter shall work together (desc).
- FR1.5 Clicking a product shall open its detail page, showing image, name, price, description, category and stock available (desc).
- FR1.6 A product with zero stock shall be shown as out of stock and cannot be added to the cart or bought.

Acceptance: Given the pre-loaded catalog, when a shopper searches "laptop" and selects category Laptops, then only laptops matching the text appear; when no product matches, an empty-state message appears.

### FR2 Accounts

- FR2.1 A visitor shall sign up with email, name and password (desc).
- FR2.2 A registered shopper shall log in with email and password and log out (desc).
- FR2.3 Browsing and product detail shall work without logging in; cart, checkout, buy now and My Orders shall require login (desc).
- FR2.4 Passwords shall be stored hashed, never in plain text.
- FR2.5 Signing up with an email already registered, or logging in with wrong credentials, shall show a clear error.

### FR3 Cart

- FR3.1 A logged-in shopper shall add a product to the cart from the homepage or the detail page (desc).
- FR3.2 The shopper shall change the quantity of a cart line or remove it; the cart total shall update (desc).
- FR3.3 Quantity shall be at least 1 and at most the product's current stock.
- FR3.4 The cart shall be saved on the server, so it survives a page reload and a server restart (desc).

### FR4 Checkout and buy now

- FR4.1 Checkout shall collect shipping information: recipient name, address, city, postal code, phone (desc).
- FR4.2 Payment shall be simulated: no real charge; a successful checkout creates the order in state Paid immediately (IC-Q6, RA-Q3).
- FR4.3 Placing an order shall reserve stock for every line in one all-or-nothing step; if any line lacks stock, no order is created and the shopper sees which product is short (IC-Q4).
- FR4.4 After a successful checkout the cart shall be emptied and the shopper taken to the new order's details.
- FR4.5 "Buy now" on the detail page shall go straight to checkout for that product and quantity, without touching the cart (desc).

### FR5 Order lifecycle

- FR5.1 Order states: Pending, Paid, Shipped, Delivered, Cancelled (IC-Q5).
- FR5.2 Orders shall advance automatically: Paid at placement, Shipped 30 seconds after placement, Delivered 60 seconds after placement (IC-Q9, RA-Q3).
- FR5.3 A shopper may cancel their own order only while it is Pending or Paid; cancelling sets it to Cancelled and returns every line's quantity to stock (IC-Q5).
- FR5.4 Cancelling a Shipped, Delivered or already Cancelled order shall be refused with a clear message (IC-Q5).
- FR5.5 Order state shall be decided by the server only; the front end shows what the server returns (desc).

### FR6 My Orders

- FR6.1 A logged-in shopper shall see a list of all their own orders, newest first, with date, total amount and status (desc).
- FR6.2 Each order shall show its full details: items (name, unit price, quantity, line total), total amount, shipping information and status (desc).
- FR6.3 The My Orders and order detail views shall refresh status automatically at least every 5 seconds, so Shipped and Delivered appear without a manual reload (desc, IC-Q9).
- FR6.4 A shopper shall never see another shopper's orders.

### FR7 Shopping assistant (stretch goal)

- FR7.1 The shopper shall type a natural-language request (for example "gaming laptop under 1500") and receive matching products (IC-Q4, desc).
- FR7.2 When a Bedrock key is set in the environment, the assistant shall use an Amazon Bedrock model to turn the request into filters: category, maximum price, minimum price, keywords (RA-Q5).
- FR7.3 When no key is set or the model call fails, the assistant shall fall back to a built-in rule-based parser for price, category and keywords (RA-Q5).
- FR7.4 Results shall come only from the catalog: the model only produces filters, and products are always looked up in the store's own data (desc).
- FR7.5 The assistant shall show the filters it applied, and say so when nothing matches.

### FR8 Overselling protection (stretch goal)

- FR8.1 When several shoppers order the same product at the same time, total units sold shall never exceed the stock (IC-Q4, desc).
- FR8.2 A shopper whose order cannot be filled shall get a clear "not enough stock" message, and no partial order shall be created.

## Non-Functional Requirements

- NFR1 Persistence: products, users, carts and orders shall be stored in a local database file and survive a server restart (desc).
- NFR2 Local run: the whole app shall start on a laptop with one install command and one start command, no cloud account required except the optional Bedrock key (FE-Q2).
- NFR3 Stack: all TypeScript, front end and back end (FE-Q4).
- NFR4 Secrets: the Bedrock key shall be read from the gitignored `.env` file only and never written to code, logs or the browser.
- NFR5 Security baseline: hashed passwords, signed session tokens, server-side validation of every input, and every cart and order request checked against the logged-in user.
- NFR6 Responsiveness: catalog, cart and order pages shall respond in under 1 second on a laptop with the seed data.
- NFR7 Testing: one automated end-to-end test shall run the full flow (Browse, Login, Add to Cart, Checkout, View Order) and pass (RA-Q4).

## Constraints

- C1 Build time: about 2 hours, proof of concept only (FE-Q1).
- C2 Runs locally on the presenter's laptop (FE-Q2).
- C3 TypeScript only (FE-Q4).

## Assumptions

- A1 No challenge rules restrict technology choices; FE-Q3 was answered "Not yet defined", so this is unconfirmed.
- A2 The Bedrock key is a short-term token; if it has expired at demo time, the rule-based fallback keeps the assistant working (RA-Q5).
- A3 Product images can be placeholder images bundled with or generated by the app; no image hosting is needed.

## Out of Scope

- Product admin tools; the catalog is pre-loaded only (IC-Q7).
- Real email notifications (IC-Q7).
- Real payments (IC-Q6).
- Password reset, social login, multi-factor sign-in.
- Deployment to a public URL (FE-Q2).

## Open Questions

- Challenge rules or judging criteria are unknown (FE-Q3).
