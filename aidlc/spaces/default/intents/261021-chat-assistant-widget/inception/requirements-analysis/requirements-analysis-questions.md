# Requirements Analysis — Questions (Chat Assistant Widget)

Context: the store already has an assistant (`POST /api/assistant`) that turns one message into filters and returns catalog products. It shows as an inline panel on the home page only.

## Q1. [Product owner] What happens to the existing inline assistant panel on the home page?

The new floating chat would do the same job, so keeping both could feel duplicated.

A. Replace it: remove the inline panel, the floating chat becomes the only assistant
B. Keep both: inline panel on the home page plus the floating chat everywhere
X. Other (please specify)

[Answer]: B

## Q2. [Product owner] What should the chat do when it opens?

A. Show a short greeting plus 3 or 4 tappable example requests (for example "Gaming laptop under 1500")
B. Show a greeting plus a few recommended products straight away, before the shopper types anything
C. Both A and B
D. Just an empty chat with an input box
X. Other (please specify)

[Answer]: A

## Q3. [Developer] Should the chat remember earlier messages in the conversation?

The assistant today treats every message on its own.

A. Keep each message independent; only the on-screen chat history is kept (simplest)
B. Make follow-ups build on earlier ones (for example "cheaper ones" after "gaming laptops"); needs server changes
X. Other (please specify)

[Answer]: A

## Q4. [Product owner] Should the conversation survive page changes and reloads?

A. Survive page navigation and reloads in the same browser tab (session storage), with a "clear chat" button
B. Survive page navigation only; a reload starts fresh
C. Start fresh every time the chat is opened
X. Other (please specify)

[Answer]: C

## Q5. [Product owner] What can the shopper do with a recommended product inside the chat?

A. See image, name and price; click to open its detail page; and add it to the cart from the chat
B. See image, name and price, and click to open its detail page only
X. Other (please specify)

[Answer]: A
