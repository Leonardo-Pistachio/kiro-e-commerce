// Pure helpers for the floating shopping assistant widget. No DOM or React
// imports, so they are unit-tested under the node Vitest setup
// (tests/chat.test.ts). The widget sends the open conversation to
// POST /api/assistant/chat, which writes the reply (FR5.2, FR5.6).

import type { AssistantChatResult, ChatTurn, Product } from './api';

/** Most products shown in one chat reply; the server returns the same number. */
export const MAX_RECOMMENDATIONS = 5;

/** Longest message the server accepts, for the input and for each history turn. */
export const MAX_MESSAGE_LENGTH = 300;

/** Most turns the server accepts in one request, the new message included. */
export const MAX_HISTORY_MESSAGES = 20;

export const GREETING =
  'Hi! I am your shopping assistant. Tell me what you need, then refine it with follow-ups like "cheaper" or "with 32 GB RAM".';

export const EXAMPLE_PROMPTS: readonly string[] = [
  'Gaming laptop under 1500',
  'Wireless mouse',
  '4K monitor',
  'Quiet office desktop under 1000',
];

export interface ChatReply {
  text: string;
  products: Product[];
}

/** A message already shown in the thread. Error bubbles are local and never sent. */
export interface ThreadMessage {
  role: ChatTurn['role'];
  text: string;
  isError: boolean;
}

function clip(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= MAX_MESSAGE_LENGTH ? trimmed : `${trimmed.slice(0, MAX_MESSAGE_LENGTH - 1).trimEnd()}…`;
}

/**
 * Builds the request history: earlier non-error turns plus the new message,
 * each clipped to the server's length limit and kept to the latest 20 turns.
 */
export function buildHistory(thread: readonly ThreadMessage[], latest: string): ChatTurn[] {
  const earlier = thread
    .filter((message) => !message.isError && message.text.trim())
    .map((message) => ({ role: message.role, text: clip(message.text) }));
  return [...earlier, { role: 'user' as const, text: clip(latest) }].slice(-MAX_HISTORY_MESSAGES);
}

/** Turns the chat endpoint's result into one reply bubble with up to 5 products. */
export function chatReply(result: AssistantChatResult): ChatReply {
  return { text: result.reply, products: result.products.slice(0, MAX_RECOMMENDATIONS) };
}

/** Reply shown in the thread when the request fails; the shopper can send again. */
export function errorReply(message: string): ChatReply {
  const detail = message.trim() || 'Something went wrong.';
  return { text: `Sorry, I could not get recommendations right now. ${detail} Please try again.`, products: [] };
}
