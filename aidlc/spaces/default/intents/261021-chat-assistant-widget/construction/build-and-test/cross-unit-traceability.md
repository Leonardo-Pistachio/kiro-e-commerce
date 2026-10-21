# Cross-Unit Traceability

## Verdict

- PASS: 31 of 31 IDs covered, 0 uncovered (`aidlc engine sensor-traceability --stage build-and-test`). FR3.1, FR3.2 and NFR1 are N/A, superseded by the person's change request.

## Coverage

| ID | Status | Owning Stage | Target |
|---|---|---|---|
| FR1.1 | Built | code-generation | client/src/styles.css |
| FR1.2 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR1.3 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR2.1 | Built | code-generation | client/src/styles.css |
| FR2.2 | Built | code-generation | client/src/chat.ts |
| FR2.3 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR2.4 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR2.5 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR2.6 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR3.1 | N/A | code-generation | Superseded: each message now carries the conversation (FR5.2, FR5.3) |
| FR3.2 | N/A | code-generation | Superseded: the server writes the reply (FR5.4, FR5.5) |
| FR3.3 | Built | code-generation | server/assistant.ts |
| FR3.4 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR3.5 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR3.6 | Built | code-generation | server/assistant.ts |
| FR3.7 | Built | code-generation | client/src/chat.ts |
| FR3.8 | Built | code-generation | server/assistant.ts |
| FR4.1 | Built | code-generation | client/src/components/Assistant.tsx |
| FR4.2 | Built | code-generation | client/src/components/ChatWidget.tsx |
| FR5.1 | Built | code-generation | client/src/components/Assistant.tsx |
| FR5.2 | Built | code-generation | client/src/chat.ts |
| FR5.3 | Built | code-generation | server/app.ts |
| FR5.4 | Built | code-generation | server/assistant.ts |
| FR5.5 | Built | code-generation | server/assistant.ts |
| FR5.6 | Built | code-generation | client/src/components/ChatWidget.tsx |
| NFR1 | N/A | code-generation | Superseded: a new server endpoint was required (FR5.3) |
| NFR2 | Built | code-generation | client/src/components/ChatWidget.tsx |
| NFR3 | Built | code-generation | client/src/components/ChatWidget.tsx |
| NFR4 | Built | code-generation | package.json |
| NFR5 | Built | code-generation | tests/chat.test.ts |
| NFR6 | Built | code-generation | tests/assistant-chat.test.ts |

## Uncovered

- None.
