# Intent Statement — PC E-Commerce Store

## Problem Statement

Build a fully functional online store where shoppers can browse a product catalog, sign up or log in, add items to a cart, check out, and review their orders afterwards. [desc]

The store sells personal computers. [Q2]

The work is a hackathon or challenge entry, judged on a live demo, so the complete shopping flow must work reliably in front of an audience. [Q1] [desc]

## Target Customer

- Shoppers looking to buy personal computers online. [Q2]
- They can browse and search the catalog, filter it by category, and open a detail page for any product. [desc]
- After signing up or logging in, they can add items to a cart, change quantities, check out to place an order, or buy straight from a product's detail page. [desc]
- They can open a "My Orders" page that lists every order with its items, amount, shipping information and status. [desc]

## Success Metrics

| Metric | Target | Source |
|--------|--------|--------|
| End-to-end demo flow | Browse, Login, Add to Cart, Checkout and View Order all complete in a live demo with zero errors | [Q3] [desc] |

## Initiative Trigger

- The initiative is an entry for a hackathon or challenge, judged on a live demo. [Q1]

## Initial Scope Signal

### Workflow-selected scope

- Workflow-selected scope: `mvp`. [scope]

### User-confirmed product boundary

**In this first version:**

- Product catalog on the homepage showing each product's image, name and price, with search and category filters. [desc]
- Product detail pages. [desc]
- Sign-up and login; cart, quantity changes, checkout and direct purchase require a signed-in shopper. [desc]
- "My Orders" page with full order details: items, amount, shipping information and status. [desc]
- Persisted data with a pre-loaded product catalog. [desc]
- Front end and back end kept consistent on order state. [desc]
- Order lifecycle: Pending, Paid, Shipped, Delivered, plus Cancelled. [Q5]
- A shopper can cancel an order only before it is Shipped, and cancelling returns its items to inventory. [Q5]
- Simulated payment: no real charge, and the order is marked Paid immediately. [Q6]
- Orders advance automatically for the demo and reach Delivered within 1 minute of being placed. [Q9]
- Stretch goal included: an LLM shopping assistant that turns natural-language requests into product filters and only recommends products that exist in the catalog. [Q4] [desc]
- Stretch goal included: concurrency-safe inventory that prevents overselling when several shoppers order the same item at the same time. [Q4] [desc]

**Out of this first version:**

- Admin tools for managing products; the catalog is pre-loaded only. [Q7]
- Real email notifications, such as order confirmation emails. [Q7]

## Assumptions & Open Questions

None.
