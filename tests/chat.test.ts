import { describe, expect, it } from 'vitest';
import type { AssistantChatResult, Product } from '../client/src/api';
import {
  EXAMPLE_PROMPTS,
  GREETING,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_LENGTH,
  MAX_RECOMMENDATIONS,
  buildHistory,
  chatReply,
  errorReply,
  type ThreadMessage,
} from '../client/src/chat';

// Builds a catalog product shaped like the API's Product type.
function makeProduct(id: number, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Product ${id}`,
    description: 'Test product',
    category: 'Laptops',
    priceCents: 129_900,
    stock: 3,
    image: `/images/product-${id}.svg`,
    ...overrides,
  };
}

function makeResult(overrides: Partial<AssistantChatResult> = {}): AssistantChatResult {
  return { source: 'rules', reply: 'Here are 2 options for Laptops.', filters: {}, keywordsRelaxed: false, products: [], ...overrides };
}

const shown = (role: ThreadMessage['role'], text: string, isError = false): ThreadMessage => ({ role, text, isError });

describe('chat greeting and examples (FR2.2)', () => {
  it('offers a greeting and 3 or 4 distinct example prompts', () => {
    expect(GREETING.length).toBeGreaterThan(0);
    expect(EXAMPLE_PROMPTS.length).toBeGreaterThanOrEqual(3);
    expect(EXAMPLE_PROMPTS.length).toBeLessThanOrEqual(4);
    expect(new Set(EXAMPLE_PROMPTS).size).toBe(EXAMPLE_PROMPTS.length);
    for (const prompt of EXAMPLE_PROMPTS) expect(prompt.trim()).toBe(prompt);
  });
});

describe('buildHistory (FR5.2)', () => {
  it('sends the earlier turns in order followed by the new message', () => {
    const thread = [shown('user', 'gaming laptop'), shown('assistant', 'Here are 3 options for Laptops.')];
    expect(buildHistory(thread, '  cheaper ones ')).toEqual([
      { role: 'user', text: 'gaming laptop' },
      { role: 'assistant', text: 'Here are 3 options for Laptops.' },
      { role: 'user', text: 'cheaper ones' },
    ]);
  });

  it('leaves error bubbles out of the conversation', () => {
    const thread = [shown('user', 'wireless mouse'), shown('assistant', 'Sorry, I could not get recommendations right now.', true)];
    expect(buildHistory(thread, 'wireless mouse')).toEqual([
      { role: 'user', text: 'wireless mouse' },
      { role: 'user', text: 'wireless mouse' },
    ]);
  });

  it('clips long replies to the server limit and keeps only the latest 20 turns', () => {
    const thread = Array.from({ length: 30 }, (_, index) => shown(index % 2 === 0 ? 'user' : 'assistant', `turn ${index} ${'x'.repeat(400)}`));
    const history = buildHistory(thread, 'latest');
    expect(history).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(history[history.length - 1]).toEqual({ role: 'user', text: 'latest' });
    expect(history[0].text.startsWith('turn 11 ')).toBe(true);
    for (const turn of history) expect(turn.text.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
  });
});

describe('chatReply (FR5.6)', () => {
  it('shows the server reply with its products in server order', () => {
    const products = [makeProduct(2), makeProduct(1)];
    const reply = chatReply(makeResult({ source: 'bedrock', reply: 'These two fit your budget.', products }));
    expect(reply).toEqual({ text: 'These two fit your budget.', products });
  });

  it('caps the products at 5', () => {
    const products = Array.from({ length: 8 }, (_, index) => makeProduct(index + 1));
    const reply = chatReply(makeResult({ products }));
    expect(MAX_RECOMMENDATIONS).toBe(5);
    expect(reply.products.map((product) => product.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows a follow-up question with no products', () => {
    const reply = chatReply(makeResult({ reply: 'What is your budget?', products: [] }));
    expect(reply).toEqual({ text: 'What is your budget?', products: [] });
  });
});

describe('errorReply (FR3.7)', () => {
  it('wraps the failure message and invites the shopper to try again', () => {
    const reply = errorReply('Cannot reach the store server.');
    expect(reply.products).toEqual([]);
    expect(reply.text).toBe('Sorry, I could not get recommendations right now. Cannot reach the store server. Please try again.');
  });

  it('falls back to a generic message when the failure has no text', () => {
    expect(errorReply('   ').text).toContain('Something went wrong.');
  });
});
