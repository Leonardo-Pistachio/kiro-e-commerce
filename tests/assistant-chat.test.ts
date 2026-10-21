import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../server/app';
import {
  CLARIFYING_QUESTION,
  MAX_CHAT_PRODUCTS,
  parseConversationRules,
  toConverseMessages,
  type ChatMessage,
} from '../server/assistant';
import { readAssistantConfig, type AssistantConfig, type OrderTimings } from '../server/config';
import { openDatabase, type Db } from '../server/db';
import { getProduct } from '../server/repo';
import { seedProducts } from '../server/seed';

// POST /api/assistant/chat: the interactive shopping assistant behind the
// floating widget (FR5.2 to FR5.5, NFR6). Bedrock is never called: the
// Bedrock-path tests inject a fake fetch through createApp's fetchImpl.

const TIMINGS: OrderTimings = { shipSeconds: 30, deliverSeconds: 60 };
const FAKE_TOKEN = 'fake-test-token';

let db: Db;
let rulesApp: ReturnType<typeof createApp>;

interface ChatProduct {
  id: number;
  category: string;
  priceCents: number;
}

const user = (text: string): ChatMessage => ({ role: 'user', text });
const assistant = (text: string): ChatMessage => ({ role: 'assistant', text });

function noKeyConfig(): AssistantConfig {
  return { ...readAssistantConfig({}), bedrockToken: undefined };
}

/** Builds a Converse API response whose text is the given model output. */
function converseResponse(modelText: string, status = 200): Response {
  return new Response(JSON.stringify({ output: { message: { role: 'assistant', content: [{ text: modelText }] } } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** An app wired to a fake Bedrock that records each request body and returns `reply`. */
function bedrockApp(reply: () => Response) {
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) });
    return reply();
  });
  const app = createApp({
    db,
    timings: TIMINGS,
    assistant: { ...readAssistantConfig({}), bedrockToken: FAKE_TOKEN },
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return { app, calls };
}

function chat(app: ReturnType<typeof createApp>, messages: unknown) {
  return request(app).post('/api/assistant/chat').send({ messages });
}

function expectCatalogProducts(products: ChatProduct[]) {
  expect(products.length).toBeLessThanOrEqual(MAX_CHAT_PRODUCTS);
  for (const product of products) expect(getProduct(db, product.id)).toBeDefined();
}

beforeAll(() => {
  db = openDatabase(':memory:');
  seedProducts(db);
  rulesApp = createApp({ db, timings: TIMINGS, assistant: noKeyConfig() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/assistant/chat input validation (FR5.3)', () => {
  const tooMany = Array.from({ length: 21 }, (_, index) => user(`laptop ${index}`));
  const cases: [string, unknown][] = [
    ['missing messages', undefined],
    ['not an array', 'gaming laptop'],
    ['an empty list', []],
    ['more than 20 messages', tooMany],
    ['an unknown role', [{ role: 'system', text: 'hi' }]],
    ['text that is not a string', [{ role: 'user', text: 42 }]],
    ['blank text', [user('   ')]],
    ['text over 300 characters', [user('a'.repeat(301))]],
    ['a last message from the assistant', [user('gaming laptop'), assistant('Here you go.')]],
  ];

  it.each(cases)('rejects %s with 400', async (_label, messages) => {
    const response = await chat(rulesApp, messages);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.message).toMatch(/1 to 20 messages/);
  });

  it('accepts exactly 20 messages and 300-character text', async () => {
    const messages = Array.from({ length: 20 }, (_, index) => (index % 2 === 0 ? user('monitor') : assistant('Sure.')));
    messages[19] = user(`monitor ${'x'.repeat(292)}`);
    const response = await chat(rulesApp, messages);
    expect(response.status).toBe(200);
  });
});

describe('rule-based fallback without a Bedrock key (FR5.5)', () => {
  it('returns a templated reply, the filters and catalog products', async () => {
    const response = await chat(rulesApp, [user('gaming laptop under 1500')]);
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('rules');
    expect(response.body.filters).toEqual({ category: 'Laptops', maxPrice: 1500, keywords: ['gaming'] });
    expect(response.body.products.length).toBeGreaterThan(0);
    expectCatalogProducts(response.body.products);
    for (const product of response.body.products as ChatProduct[]) {
      expect(product.category).toBe('Laptops');
      expect(product.priceCents).toBeLessThanOrEqual(150000);
    }
    const count = response.body.products.length;
    const lead = count === 1 ? 'Here is 1 option' : `Here are ${count} options`;
    expect(response.body.reply).toBe(`${lead} for Laptops up to $1,500 matching gaming.`);
  });

  it('carries filters over from earlier user turns (FR5.2)', async () => {
    const response = await chat(rulesApp, [user('gaming laptop'), assistant('Here are some laptops.'), user('under 1500')]);
    expect(response.status).toBe(200);
    expect(response.body.filters).toEqual({ category: 'Laptops', maxPrice: 1500 });
    expect(response.body.products.length).toBeGreaterThan(0);
    for (const product of response.body.products as ChatProduct[]) {
      expect(product.category).toBe('Laptops');
      expect(product.priceCents).toBeLessThanOrEqual(150000);
    }
    expect(response.body.reply).toContain('Laptops up to $1,500');
  });

  it('caps the products at 5 and says how many matched', async () => {
    const response = await chat(rulesApp, [user('something for gaming')]);
    expect(response.body.products).toHaveLength(MAX_CHAT_PRODUCTS);
    expect(response.body.reply).toMatch(/^I found \d+ matches for products matching gaming\. Here are the top 5\.$/);
  });

  it('asks a follow-up question when nothing in the conversation is recognizable', async () => {
    for (const text of ['hi', 'hello there']) {
      const response = await chat(rulesApp, [user(text)]);
      expect(response.status).toBe(200);
      expect(response.body.reply).toBe(CLARIFYING_QUESTION);
      expect(response.body.products).toEqual([]);
    }
  });

  it('says when nothing matches and suggests another request', async () => {
    const response = await chat(rulesApp, [user('laptop under 100')]);
    expect(response.body.products).toEqual([]);
    expect(response.body.reply).toBe('I could not find a match for Laptops up to $100. Try a higher budget, fewer details or another category.');
  });

  it('notes relaxed keywords and keeps the other filters', async () => {
    const response = await chat(rulesApp, [user('oled monitor')]);
    expect(response.body.keywordsRelaxed).toBe(true);
    expect(response.body.products.length).toBeGreaterThan(0);
    for (const product of response.body.products as ChatProduct[]) expect(product.category).toBe('Monitors');
    expect(response.body.reply).toContain('Nothing matched oled exactly, so I left those words out.');
  });
});

describe('with Bedrock (fake fetch, FR5.4)', () => {
  it('passes the model reply through with catalog-only products and sends the whole conversation', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const modelOutput = { reply: 'Great choice for photo work. Here are some 4K monitors.', filters: { category: 'Monitors', keywords: ['4k'] } };
    const { app, calls } = bedrockApp(() => converseResponse(JSON.stringify(modelOutput)));
    const response = await chat(app, [assistant('Hi! How can I help?'), user('I edit photos'), user('a 4k screen please')]);

    expect(response.status).toBe(200);
    expect(response.body.source).toBe('bedrock');
    expect(response.body.reply).toBe(modelOutput.reply);
    expect(response.body.filters).toEqual({ category: 'Monitors', keywords: ['4k'] });
    expect(response.body.products.length).toBeGreaterThan(0);
    expectCatalogProducts(response.body.products);
    for (const product of response.body.products as ChatProduct[]) expect(product.category).toBe('Monitors');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://bedrock-runtime.us-east-1.amazonaws.com/model/us.amazon.nova-lite-v1%3A0/converse');
    expect(calls[0].headers.Authorization).toBe(`Bearer ${FAKE_TOKEN}`);
    // Leading assistant greeting dropped, consecutive user turns merged.
    expect(calls[0].body.messages).toEqual([{ role: 'user', content: [{ text: 'I edit photos\na 4k screen please' }] }]);
    expect(calls[0].body.inferenceConfig).toEqual({ maxTokens: 400, temperature: 0.3 });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('returns a clarifying question with no products when the model omits filters', async () => {
    const question = 'Sure. Is this for gaming, office work or something else, and what is your budget?';
    const { app } = bedrockApp(() => converseResponse(`Here you go: {"reply": "${question}"}`));
    const response = await chat(app, [user('I need a computer')]);
    expect(response.body.source).toBe('bedrock');
    expect(response.body.reply).toBe(question);
    expect(response.body.filters).toEqual({});
    expect(response.body.products).toEqual([]);
  });

  it('adds a no-match note when the model filters find nothing', async () => {
    const { app } = bedrockApp(() =>
      converseResponse(JSON.stringify({ reply: 'Let me look for a cheap laptop.', filters: { category: 'Laptops', maxPrice: 100 } })),
    );
    const response = await chat(app, [user('laptop for 100 dollars')]);
    expect(response.body.source).toBe('bedrock');
    expect(response.body.products).toEqual([]);
    expect(response.body.reply).toBe('Let me look for a cheap laptop. I could not find a match for Laptops up to $100. Try a higher budget, fewer details or another category.');
  });

  it.each([
    ['invalid filters', JSON.stringify({ reply: 'Phones coming up.', filters: { category: 'Phones' } })],
    ['a missing reply', JSON.stringify({ filters: { category: 'Laptops' } })],
    ['text with no JSON', 'Sorry, I cannot help with that.'],
  ])('falls back to the rules on %s, without logging the key', async (_label, modelText) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { app } = bedrockApp(() => converseResponse(modelText));
    const response = await chat(app, [user('gaming laptop'), assistant('Here are some.'), user('under 1500')]);
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('rules');
    expect(response.body.filters).toEqual({ category: 'Laptops', maxPrice: 1500 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).not.toContain(FAKE_TOKEN);
  });

  it('falls back to the rules when Bedrock returns an HTTP error', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { app } = bedrockApp(() => converseResponse('{}', 503));
    const response = await chat(app, [user('wireless mouse')]);
    expect(response.body.source).toBe('rules');
    expect(response.body.filters).toEqual({ category: 'Accessories', keywords: ['wireless', 'mouse'] });
    expect(response.body.products.length).toBeGreaterThan(0);
  });
});

describe('conversation helpers', () => {
  it('parseConversationRules lets later turns win per field and keeps only the latest keywords', () => {
    expect(parseConversationRules([user('gaming laptop over 2000'), assistant('ok'), user('a quiet desktop under 1500')])).toEqual({
      category: 'Desktops',
      maxPrice: 1500,
      keywords: ['quiet'],
    });
    expect(parseConversationRules([user('monitor between 300 and 600'), user('with usb-c')])).toEqual({
      category: 'Monitors',
      minPrice: 300,
      maxPrice: 600,
      keywords: ['usb-c'],
    });
  });

  it('toConverseMessages starts with the user and alternates roles', () => {
    expect(toConverseMessages([assistant('Hi'), user('a'), assistant('b'), assistant('c'), user('d')])).toEqual([
      { role: 'user', content: [{ text: 'a' }] },
      { role: 'assistant', content: [{ text: 'b\nc' }] },
      { role: 'user', content: [{ text: 'd' }] },
    ]);
  });
});
