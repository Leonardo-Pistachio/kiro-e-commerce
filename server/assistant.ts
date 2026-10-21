import type { AssistantConfig } from './config';
import type { Db } from './db';
import { listProducts, type Product } from './repo';
import { CATEGORIES, type Category } from './seed';

// The shopping assistant turns a natural-language request into catalog
// filters. Amazon Bedrock is used when a key is configured; otherwise, or on
// any failure, a rule-based parser does the job. Either way the model only
// produces filters: products always come from the store database.

export type AssistantSource = 'bedrock' | 'rules';

/** Filters in US dollars, as shown to the shopper. */
export interface AssistantFilters {
  category?: Category;
  minPrice?: number;
  maxPrice?: number;
  keywords?: string[];
}

export interface AssistantResult {
  source: AssistantSource;
  filters: AssistantFilters;
  /** True when no product matched the keywords, so they were dropped from the search. */
  keywordsRelaxed: boolean;
  products: Product[];
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const MAX_KEYWORDS = 5;

// ---------- Validation of model output ----------

function readPrice(value: unknown): number | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000) return null;
  return value;
}

function readCategory(value: unknown): Category | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return null;
  const match = CATEGORIES.find((category) => category.toLowerCase() === value.trim().toLowerCase());
  return match ?? null;
}

function readKeywords(value: unknown): string[] | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || !value.every((word) => typeof word === 'string')) return null;
  const words = value.map((word: string) => word.trim().toLowerCase()).filter((word) => word.length > 0 && word.length <= 40);
  return words.length > 0 ? [...new Set(words)].slice(0, MAX_KEYWORDS) : undefined;
}

/** Accepts only a well-formed filter object; returns null for anything else. */
export function validateFilters(raw: unknown): AssistantFilters | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const category = readCategory(source.category);
  const minPrice = readPrice(source.minPrice);
  const maxPrice = readPrice(source.maxPrice);
  const keywords = readKeywords(source.keywords);
  if (category === null || minPrice === null || maxPrice === null || keywords === null) return null;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) return null;
  const filters: AssistantFilters = {};
  if (category) filters.category = category;
  if (minPrice !== undefined) filters.minPrice = minPrice;
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;
  if (keywords) filters.keywords = keywords;
  return filters;
}

/** Pulls the first JSON object out of model text (tolerates stray prose or code fences). */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Model reply contained no JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

// ---------- Rule-based parser ----------

const CATEGORY_WORDS: Record<string, Category> = {
  laptop: 'Laptops', laptops: 'Laptops', notebook: 'Laptops', notebooks: 'Laptops', ultrabook: 'Laptops',
  desktop: 'Desktops', desktops: 'Desktops', tower: 'Desktops', workstation: 'Desktops',
  monitor: 'Monitors', monitors: 'Monitors', display: 'Monitors', displays: 'Monitors', screen: 'Monitors', screens: 'Monitors',
  accessory: 'Accessories', accessories: 'Accessories',
};

/** Accessory item words: they set the category and stay as a keyword (normalized). */
const ACCESSORY_ITEMS: Record<string, string> = {
  keyboard: 'keyboard', keyboards: 'keyboard', mouse: 'mouse', mice: 'mouse',
  headset: 'headset', headsets: 'headset', headphones: 'headset', webcam: 'webcam', webcams: 'webcam',
  dock: 'dock', docking: 'dock', hub: 'hub',
};

/** Generic computer words: Desktops only when nothing more specific was said. */
const GENERIC_PC_WORDS = new Set(['pc', 'pcs', 'computer', 'computers']);

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'i', 'me', 'my', 'we', 'want', 'need', 'looking', 'look', 'for', 'with', 'and', 'or', 'but',
  'under', 'below', 'over', 'above', 'less', 'more', 'than', 'up', 'to', 'at', 'least', 'most', 'max', 'min',
  'maximum', 'minimum', 'between', 'from', 'price', 'priced', 'dollars', 'dollar', 'usd', 'bucks', 'something',
  'some', 'good', 'best', 'show', 'find', 'get', 'buy', 'please', 'can', 'you', 'any', 'that', 'which', 'is',
  'are', 'in', 'of', 'on', 'around', 'about', 'new', 'one', 'cheaper', 'no', 'within', 'starting', 'it', 'what',
  'have', 'do', 'like', 'would', 'should', 'under', 'budget-friendly',
]);

const AMOUNT = String.raw`\$?\s*(\d[\d,]*(?:\.\d+)?\s*k?)`;
const BETWEEN_PATTERN = new RegExp(String.raw`between\s+${AMOUNT}\s*(?:and|to|-)\s*${AMOUNT}`);
const MAX_PATTERN = new RegExp(String.raw`(?:under|below|less than|cheaper than|up to|no more than|at most|max(?:imum)?|within|<=?)\s*${AMOUNT}`);
const MIN_PATTERN = new RegExp(String.raw`(?:over|above|more than|at least|min(?:imum)?|starting at|from|>=?)\s*${AMOUNT}`);

function parseAmount(raw: string): number {
  const compact = raw.replace(/[,\s]/g, '');
  const isThousands = compact.endsWith('k');
  const value = Number(isThousands ? compact.slice(0, -1) : compact);
  return isThousands ? value * 1000 : value;
}

type PriceFilters = Pick<AssistantFilters, 'minPrice' | 'maxPrice'>;

/** Reads price phrases and returns the text with those phrases removed. */
function parsePrices(text: string): { prices: PriceFilters; rest: string } {
  const between = BETWEEN_PATTERN.exec(text);
  if (between) {
    const [low, high] = [parseAmount(between[1]), parseAmount(between[2])].sort((a, b) => a - b);
    return { prices: { minPrice: low, maxPrice: high }, rest: text.replace(between[0], ' ') };
  }
  const prices: PriceFilters = {};
  let rest = text;
  const max = MAX_PATTERN.exec(rest);
  if (max) {
    prices.maxPrice = parseAmount(max[1]);
    rest = rest.replace(max[0], ' ');
  }
  const min = MIN_PATTERN.exec(rest);
  if (min) {
    prices.minPrice = parseAmount(min[1]);
    rest = rest.replace(min[0], ' ');
  }
  if (prices.minPrice !== undefined && prices.maxPrice !== undefined && prices.minPrice > prices.maxPrice) delete prices.minPrice;
  return { prices, rest };
}

function isKeyword(token: string): boolean {
  if (STOP_WORDS.has(token) || /^\d+(\.\d+)?$/.test(token)) return false;
  // Short tokens only count when they carry a digit, like "4k".
  return token.length >= 3 || /\d/.test(token);
}

/** Turns e.g. "gaming laptop under 1500" into { category: 'Laptops', maxPrice: 1500, keywords: ['gaming'] }. */
export function parseRules(request: string): AssistantFilters {
  const { prices, rest: text } = parsePrices(request.toLowerCase());
  const filters: AssistantFilters = { ...prices };
  const keywords: string[] = [];
  let sawGenericPc = false;
  for (const token of text.match(/[a-z0-9][a-z0-9-]*/g) ?? []) {
    if (CATEGORY_WORDS[token]) {
      filters.category ??= CATEGORY_WORDS[token];
    } else if (ACCESSORY_ITEMS[token]) {
      filters.category ??= 'Accessories';
      keywords.push(ACCESSORY_ITEMS[token]);
    } else if (GENERIC_PC_WORDS.has(token)) {
      sawGenericPc = true;
    } else if (isKeyword(token)) {
      keywords.push(token);
    }
  }
  if (!filters.category && sawGenericPc) filters.category = 'Desktops';
  const unique = [...new Set(keywords)].slice(0, MAX_KEYWORDS);
  if (unique.length > 0) filters.keywords = unique;
  return filters;
}

// ---------- Bedrock ----------

const SYSTEM_PROMPT = [
  'You convert shopping requests for a PC store into search filters.',
  'Reply with ONLY a JSON object: no prose, no code fences.',
  'Allowed fields, all optional:',
  '"category": one of "Laptops", "Desktops", "Monitors", "Accessories";',
  '"minPrice": number in US dollars; "maxPrice": number in US dollars;',
  '"keywords": array of up to 5 short lowercase words describing the product, for example "gaming", "4k", "wireless".',
  'Do not put category names or prices in keywords. Omit any field you cannot infer. Never name products.',
].join(' ');

const REGION_PATTERN = /^[a-z]{2}(-[a-z]+)+-\d+$/;

interface ConverseMessage {
  role: 'user' | 'assistant';
  content: { text: string }[];
}

interface ConversePayload {
  system: { text: string }[];
  messages: ConverseMessage[];
  inferenceConfig: { maxTokens: number; temperature: number };
}

/** Sends one Converse request with a bearer token and returns the reply text. Throws on any failure. */
async function converseText(payload: ConversePayload, config: AssistantConfig, fetchImpl: FetchLike): Promise<string> {
  if (!config.bedrockToken) throw new Error('No Bedrock key configured');
  if (!REGION_PATTERN.test(config.region)) throw new Error('AWS_REGION is not a valid region name');
  const url = `https://bedrock-runtime.${config.region}.amazonaws.com/model/${encodeURIComponent(config.modelId)}/converse`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.bedrockToken}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Bedrock returned HTTP ${response.status}`);
    const body = (await response.json()) as { output?: { message?: { content?: { text?: string }[] } } };
    const text = body.output?.message?.content?.find((part) => typeof part.text === 'string')?.text;
    if (!text) throw new Error('Bedrock reply had no text content');
    return text;
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error(`Bedrock request timed out after ${config.timeoutMs} ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Calls the Bedrock Converse API with a bearer token. Throws on any failure. */
export async function askBedrock(request: string, config: AssistantConfig, fetchImpl: FetchLike = fetch): Promise<AssistantFilters> {
  const text = await converseText(
    {
      system: [{ text: SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: [{ text: request }] }],
      inferenceConfig: { maxTokens: 200, temperature: 0 },
    },
    config,
    fetchImpl,
  );
  const filters = validateFilters(extractJsonObject(text));
  if (!filters) throw new Error('Bedrock reply was not a valid filter object');
  return filters;
}

/** Uses Bedrock when configured; falls back to the rule-based parser on any problem. */
export async function interpretRequest(
  request: string,
  config: AssistantConfig,
  fetchImpl: FetchLike = fetch,
): Promise<{ source: AssistantSource; filters: AssistantFilters }> {
  if (config.bedrockToken) {
    try {
      return { source: 'bedrock', filters: await askBedrock(request, config, fetchImpl) };
    } catch (error) {
      // The message never contains the key: only status codes and parse problems.
      console.warn(`[assistant] Bedrock unavailable, using rule-based parser: ${(error as Error).message}`);
    }
  }
  return { source: 'rules', filters: parseRules(request) };
}

function toProductFilters(filters: AssistantFilters, withKeywords: boolean) {
  return {
    category: filters.category,
    minPriceCents: filters.minPrice === undefined ? undefined : Math.round(filters.minPrice * 100),
    maxPriceCents: filters.maxPrice === undefined ? undefined : Math.round(filters.maxPrice * 100),
    keywords: withKeywords ? filters.keywords : undefined,
  };
}

/** Looks the filters up in the store database; drops keywords if they alone rule everything out. */
export function findAssistantProducts(db: Db, filters: AssistantFilters): { products: Product[]; keywordsRelaxed: boolean } {
  const products = listProducts(db, toProductFilters(filters, true));
  if (products.length > 0 || !filters.keywords?.length) return { products, keywordsRelaxed: false };
  const relaxed = listProducts(db, toProductFilters(filters, false));
  return { products: relaxed, keywordsRelaxed: relaxed.length > 0 };
}

export async function runAssistant(db: Db, request: string, config: AssistantConfig, fetchImpl: FetchLike = fetch): Promise<AssistantResult> {
  const { source, filters } = await interpretRequest(request, config, fetchImpl);
  return { source, filters, ...findAssistantProducts(db, filters) };
}

// ---------- Interactive chat (POST /api/assistant/chat) ----------
// The floating widget sends the whole open conversation. Bedrock writes a
// natural reply and optional filters; without a key, or on any failure, the
// rule-based parser reads the user turns and a templated reply is used.
// Products always come from the store database, never from the model.

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ChatResult extends AssistantResult {
  reply: string;
}

export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_TEXT_LENGTH = 300;
/** Products returned with one chat reply; the widget shows the same number. */
export const MAX_CHAT_PRODUCTS = 5;
const MAX_REPLY_LENGTH = 500;

/** Accepts 1 to 20 well-formed messages ending with a user turn; returns null for anything else. */
export function readChatMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CHAT_MESSAGES) return null;
  const messages: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const { role, text } = item as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof text !== 'string' || text.length > MAX_CHAT_TEXT_LENGTH || !text.trim()) return null;
    messages.push({ role, text: text.trim() });
  }
  return messages[messages.length - 1].role === 'user' ? messages : null;
}

/** Converse needs alternating turns that start with the user: drop leading assistant turns, merge repeats. */
export function toConverseMessages(messages: ChatMessage[]): ConverseMessage[] {
  const firstUser = messages.findIndex((message) => message.role === 'user');
  const turns: ConverseMessage[] = [];
  for (const message of firstUser === -1 ? [] : messages.slice(firstUser)) {
    const previous = turns[turns.length - 1];
    if (previous?.role === message.role) previous.content[0].text += `\n${message.text}`;
    else turns.push({ role: message.role, content: [{ text: message.text }] });
  }
  return turns;
}

const CHAT_SYSTEM_PROMPT = [
  'You are a friendly shopping assistant for a PC store that sells laptops, desktops, monitors and accessories.',
  'Reply with ONLY a JSON object, no prose and no code fences: {"reply": "...", "filters": {...}}.',
  '"reply" is your short, natural answer to the shopper, under 400 characters.',
  '"filters" describes what to search for, using only these optional fields:',
  '"category": one of "Laptops", "Desktops", "Monitors", "Accessories";',
  '"minPrice": number in US dollars; "maxPrice": number in US dollars;',
  '"keywords": array of up to 5 short lowercase words describing the product, for example "gaming", "4k", "wireless".',
  'Use the whole conversation: follow-ups such as "cheaper ones" or "with more RAM" refine the earlier request.',
  'When the request is too vague to search, ask one follow-up question about category, budget or use, and omit "filters".',
  'Never name or invent specific products, models, brands or prices: the store shows the matching products itself.',
  'Do not put category names or prices in keywords.',
].join(' ');

function capReply(text: string): string {
  const reply = text.replace(/\s+/g, ' ').trim();
  return reply.length <= MAX_REPLY_LENGTH ? reply : `${reply.slice(0, MAX_REPLY_LENGTH - 1).trimEnd()}…`;
}

/** Validates the model's chat JSON; throws when the reply or filters are malformed. */
export function readChatModelOutput(raw: unknown): { reply: string; filters: AssistantFilters } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Bedrock chat reply was not a JSON object');
  const { reply, filters } = raw as Record<string, unknown>;
  if (typeof reply !== 'string' || !reply.trim()) throw new Error('Bedrock chat reply had no reply text');
  if (filters === undefined || filters === null) return { reply: capReply(reply), filters: {} };
  const validated = validateFilters(filters);
  if (!validated) throw new Error('Bedrock chat reply had invalid filters');
  return { reply: capReply(reply), filters: validated };
}

/** Calls Bedrock with the whole conversation. Throws on any failure. */
export async function askBedrockChat(
  messages: ChatMessage[],
  config: AssistantConfig,
  fetchImpl: FetchLike = fetch,
): Promise<{ reply: string; filters: AssistantFilters }> {
  const text = await converseText(
    {
      system: [{ text: CHAT_SYSTEM_PROMPT }],
      messages: toConverseMessages(messages),
      inferenceConfig: { maxTokens: 400, temperature: 0.3 },
    },
    config,
    fetchImpl,
  );
  return readChatModelOutput(extractJsonObject(text));
}

type ScalarFilterField = 'category' | 'minPrice' | 'maxPrice';

/**
 * Rule-based reading of a conversation: each user turn is parsed in order and
 * later turns override earlier ones per field; keywords come from the latest
 * turn only. If the merged prices contradict, the older bound is dropped.
 */
export function parseConversationRules(messages: ChatMessage[]): AssistantFilters {
  const userTexts = messages.filter((message) => message.role === 'user').map((message) => message.text);
  const merged: AssistantFilters = {};
  const latest = parseRules(userTexts[userTexts.length - 1] ?? '');
  for (const text of userTexts.slice(0, -1)) {
    const parsed = parseRules(text);
    for (const field of ['category', 'minPrice', 'maxPrice'] as ScalarFilterField[]) {
      if (parsed[field] !== undefined) Object.assign(merged, { [field]: parsed[field] });
    }
  }
  for (const field of ['category', 'minPrice', 'maxPrice'] as ScalarFilterField[]) {
    if (latest[field] !== undefined) Object.assign(merged, { [field]: latest[field] });
  }
  if (merged.minPrice !== undefined && merged.maxPrice !== undefined && merged.minPrice > merged.maxPrice) {
    if (latest.maxPrice !== undefined) delete merged.minPrice;
    else delete merged.maxPrice;
  }
  if (latest.keywords) merged.keywords = latest.keywords;
  return merged;
}

function hasFilters(filters: AssistantFilters): boolean {
  return filters.category !== undefined || filters.minPrice !== undefined || filters.maxPrice !== undefined || Boolean(filters.keywords?.length);
}

function isKeywordsOnly(filters: AssistantFilters): boolean {
  return filters.category === undefined && filters.minPrice === undefined && filters.maxPrice === undefined;
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Summarizes filters for a reply, e.g. "Laptops up to $1,500 matching gaming". */
export function describeChatFilters(filters: AssistantFilters, keywordsRelaxed = false): string {
  const parts: string[] = [filters.category ?? 'products'];
  const { minPrice, maxPrice } = filters;
  if (minPrice !== undefined && maxPrice !== undefined) parts.push(`between ${formatUsd(minPrice)} and ${formatUsd(maxPrice)}`);
  else if (maxPrice !== undefined) parts.push(`up to ${formatUsd(maxPrice)}`);
  else if (minPrice !== undefined) parts.push(`from ${formatUsd(minPrice)}`);
  if (!keywordsRelaxed && filters.keywords?.length) parts.push(`matching ${filters.keywords.join(', ')}`);
  return parts.join(' ');
}

export const CLARIFYING_QUESTION =
  'Happy to help. What are you shopping for: a laptop, a desktop, a monitor or an accessory? A budget or main use, such as gaming or office work, helps too.';

function noMatchSentence(filters: AssistantFilters): string {
  return `I could not find a match for ${describeChatFilters(filters)}. Try a higher budget, fewer details or another category.`;
}

function relaxedSentence(filters: AssistantFilters): string {
  return `Nothing matched ${filters.keywords?.join(', ')} exactly, so I left those words out.`;
}

/** Templated reply used by the rule-based fallback. */
export function composeRulesReply(filters: AssistantFilters, total: number, keywordsRelaxed: boolean): string {
  if (total === 0) return noMatchSentence(filters);
  const summary = describeChatFilters(filters, keywordsRelaxed);
  const sentences =
    total > MAX_CHAT_PRODUCTS
      ? [`I found ${total} matches for ${summary}. Here are the top ${MAX_CHAT_PRODUCTS}.`]
      : [`Here ${total === 1 ? 'is 1 option' : `are ${total} options`} for ${summary}.`];
  if (keywordsRelaxed) sentences.push(relaxedSentence(filters));
  return sentences.join(' ');
}

/** Bedrock wrote the reply without seeing the results, so add the facts it could not know. */
function annotateModelReply(reply: string, filters: AssistantFilters, total: number, keywordsRelaxed: boolean): string {
  if (total === 0) return `${reply} ${noMatchSentence(filters)}`;
  return keywordsRelaxed ? `${reply} ${relaxedSentence(filters)}` : reply;
}

async function interpretConversation(
  messages: ChatMessage[],
  config: AssistantConfig,
  fetchImpl: FetchLike,
): Promise<{ source: AssistantSource; reply?: string; filters: AssistantFilters }> {
  if (config.bedrockToken) {
    try {
      return { source: 'bedrock', ...(await askBedrockChat(messages, config, fetchImpl)) };
    } catch (error) {
      // The message never contains the key: only status codes and parse problems.
      console.warn(`[assistant] Bedrock chat unavailable, using rule-based parser: ${(error as Error).message}`);
    }
  }
  return { source: 'rules', filters: parseConversationRules(messages) };
}

/** Answers one chat turn: a reply plus up to 5 catalog products. */
export async function runChat(db: Db, rawMessages: unknown, config: AssistantConfig, fetchImpl: FetchLike = fetch): Promise<ChatResult> {
  const messages = readChatMessages(rawMessages);
  if (!messages) throw new TypeError('runChat needs 1 to 20 valid messages ending with a user message');
  const { source, reply, filters } = await interpretConversation(messages, config, fetchImpl);
  if (!hasFilters(filters)) {
    // A clarifying question (model) or nothing recognizable yet (rules): no products.
    return { source, reply: reply ?? CLARIFYING_QUESTION, filters, keywordsRelaxed: false, products: [] };
  }
  const { products, keywordsRelaxed } = findAssistantProducts(db, filters);
  if (keywordsRelaxed && isKeywordsOnly(filters)) {
    // Dropping the only filter would list the whole catalog, which answers nothing:
    // the rules ask what the shopper wants; a model reply gets the no-match note.
    const text = reply === undefined ? CLARIFYING_QUESTION : `${reply} ${noMatchSentence(filters)}`;
    return { source, reply: text, filters, keywordsRelaxed: false, products: [] };
  }
  const text = reply === undefined
    ? composeRulesReply(filters, products.length, keywordsRelaxed)
    : annotateModelReply(reply, filters, products.length, keywordsRelaxed);
  return { source, reply: text, filters, keywordsRelaxed, products: products.slice(0, MAX_CHAT_PRODUCTS) };
}
