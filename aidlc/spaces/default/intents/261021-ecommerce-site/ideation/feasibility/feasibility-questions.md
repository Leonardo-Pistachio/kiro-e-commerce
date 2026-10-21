# Feasibility & Constraints — Questions

## Q1. [Product owner] When is the demo, and how much build time is there?

The timeline decides how much of the scope, including both stretch goals, is realistic.

A. Within 1-2 days
B. Within about a week
C. Within 2-4 weeks
D. No fixed deadline
E. Not yet defined
X. Other (please specify)

[Answer]: X. only POC, in 2 hours

## Q2. [Product owner] Where will the demo run?

This decides whether hosting, accounts and network access are constraints at all.

A. Locally on my own laptop
B. On a public URL that judges can open themselves
C. Either: local is fine, a public URL is a bonus
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Product owner] Are there any rules from the challenge or any compliance needs to respect?

Payment is simulated and the shoppers are demo users, so real compliance (such as card-data rules or privacy law) may not apply. The challenge itself may still have rules.

A. None: no compliance needs and no challenge rules on technology
B. The challenge restricts which technologies or services can be used (please describe)
C. The challenge requires the source code to be public or submitted
D. Not yet defined
X. Other (please specify)

[Answer]: D

## Q4. [Developer] Which languages or frameworks are you comfortable with?

You'll need to run and present the result, so it should be built with tools you can work with.

A. JavaScript or TypeScript (front end and back end)
B. Python for the back end, JavaScript or TypeScript for the front end
C. Java or Kotlin for the back end, JavaScript or TypeScript for the front end
D. No preference: pick whatever is quickest and most reliable for the demo
E. Not yet defined
X. Other (please specify)

[Answer]: A. all TypeScript

## Q5. [Developer] Which AI model service can the shopping assistant use?

The assistant needs access to a language model. That means an account or API key, network access during the demo, and some cost per request.

A. I have an API key for a hosted model service (for example OpenAI, Anthropic, or Google)
B. I have AWS access and can use Amazon Bedrock
C. A model running locally on my machine (no internet needed)
D. None yet: the assistant should fall back to plain keyword matching when no model is available
E. Not yet defined
X. Other (please specify)

[Answer]:

## Q6. [Developer] Are there existing systems or cloud accounts this must use?

This tells me whether anything already exists that the store has to connect to or run on.

A. None: everything is built from scratch and runs on its own
B. An existing AWS account should host it
C. Another cloud or hosting platform should host it (please name it)
D. Not yet defined
X. Other (please specify)

[Answer]:

## Q7. [Product owner] How long should an order stay cancellable?

You chose cancel-before-Shipped and delivery within 1 minute. That leaves only seconds to show a cancellation, which is a demo risk.

A. Shipped happens 30 seconds after the order is placed, then Delivered at 1 minute
B. Shipped happens 45 seconds after the order is placed, then Delivered at 1 minute
C. Keep the 1 minute total but let the timing be configurable, so I can slow it down during the demo
D. Not yet defined: choose something that makes cancellation easy to demo
X. Other (please specify)

[Answer]:

## Q8. [Product owner] How should we fit the work into 2 hours?

You said this is only a proof of concept, to be built in 2 hours (Q1). The current mvp plan has 19 stages, each with its own approval stop, before and during the build. Both stretch goals are also in scope (Intent Capture Q4). Those don't fit 2 hours together.

A. Switch to the lighter poc plan (4 stages, straight to a working build), keeping the scope already captured
B. Switch to the express plan (6 stages: requirements to working code, no separate design pass)
C. Stay on the mvp plan, and accept it will take longer than 2 hours
D. Stay on the mvp plan, but drop the stretch goals to save time
X. Other (please specify)

[Answer]: A
