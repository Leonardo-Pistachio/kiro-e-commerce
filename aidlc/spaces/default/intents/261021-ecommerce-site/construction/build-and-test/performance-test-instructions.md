# Performance Test Instructions

## Scope

- Minimal test strategy: no load test suite. The one performance target is NFR6: catalog, cart and order pages respond in under 1 second on a laptop with the seed data.

## How to Check NFR6

- Start the app (`npm start`), then time the catalog endpoints:
  - `curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3001/api/products`
  - `curl -s -o /dev/null -w "%{time_total}\n" "http://localhost:3001/api/products?q=laptop&category=Laptops"`
- Pass: each time is below 1 second.
- The assistant's Bedrock call is network-bound and outside NFR6; it has an 8-second timeout with fallback.
