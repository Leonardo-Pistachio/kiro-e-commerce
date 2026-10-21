# Business Overview

## Purpose

Kiro PC Store is a proof-of-concept online store for PCs, built for a live hackathon demo (`README.md`). Shoppers browse a fixed catalog of 20 products, create an account, keep a server-side cart, check out with simulated payment, and follow an automatic order lifecycle.

## Business Domain

Consumer electronics retail, four categories: Laptops, Desktops, Monitors, Accessories (`server/seed.ts`). Prices are held in US cents.

## Key Functionality

| Capability | Summary | Where |
|---|---|---|
| Catalog | Search by text, filter by category and price, product detail with stock | `server/repo.ts` `listProducts`, `HomePage`, `ProductPage` |
| Accounts | Sign up, log in, log out; salted scrypt hashes; 7-day bearer sessions | `server/auth.ts` |
| Cart | Per-user server cart, quantity capped at stock | `server/app.ts` cart routes, `CartPage` |
| Checkout | Shipping form, simulated payment, order created as Paid; Buy now skips the cart | `server/orders.ts` `placeOrder`, `CheckoutPage` |
| Order lifecycle | Paid to Shipped (30 s) to Delivered (60 s) by elapsed time; cancel only before Shipped, stock returned | `server/orders.ts` `deriveStatus`, `cancelOrder` |
| Oversell protection | One `BEGIN IMMEDIATE` transaction per order; conditional stock decrement | `server/db.ts` `inTransaction`, `repo.ts` `decrementStockIfAvailable` |
| Shopping assistant | Natural-language request to catalog filters (Amazon Bedrock, rule-based fallback); products always come from the store database | `server/assistant.ts`, `client/src/components/Assistant.tsx` |

## Shopping Assistant (basis for the current intent)

Today the assistant is an inline panel on the home page only. A shopper types a request (for example "gaming laptop under 1500") or clicks an example chip; the server returns which engine answered, the filters it applied, and matching products, shown as product cards with Add to cart. It is single-turn: no conversation history and no reply sentence. Detail in `architecture.md` (Interaction Diagrams) and `api-documentation.md`.

## Actors

- Visitor: browses catalog and uses the assistant without logging in.
- Shopper: logged-in visitor; cart, checkout, My Orders.
- No admin role exists (README "Known limits").

## Out of Scope Today

Real payments, emails, password reset, admin tools, rate limiting.
