import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { MAX_CHAT_MESSAGES, MAX_CHAT_TEXT_LENGTH, readChatMessages, runAssistant, runChat } from './assistant';
import { login, logout, signup, userForToken, validateSignup, type PublicUser } from './auth';
import type { AssistantConfig, OrderTimings } from './config';
import type { Db } from './db';
import { AppError, badRequest, conflict, notFound, unauthorized } from './errors';
import { cancelOrder, getOrderView, listOrderViews, parsePositiveInt, placeOrder, validateShipping } from './orders';
import { deleteCartLine, getCartQuantity, getProduct, listCart, listProducts, setCartQuantity } from './repo';
import { CATEGORIES, type Category } from './seed';

export interface AppOptions {
  db: Db;
  timings: OrderTimings;
  assistant: AssistantConfig;
  /** Clock used for sessions and order status; injectable for tests. */
  now?: () => number;
  /** Built client to serve (production `npm start`). */
  staticDir?: string;
  /** Used for the Bedrock call; injectable for tests. */
  fetchImpl?: typeof fetch;
}

interface AuthLocals {
  user: PublicUser;
  token: string;
}

function auth(res: Response): AuthLocals {
  return res.locals as AuthLocals;
}

function readCategory(value: unknown): Category | undefined {
  if (value === undefined || value === '') return undefined;
  const match = CATEGORIES.find((category) => category === value);
  if (!match) throw badRequest(`Category must be one of: ${CATEGORIES.join(', ')}.`);
  return match;
}

function readOptionalPriceCents(value: unknown, label: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars < 0) throw badRequest(`${label} must be a positive number.`);
  return Math.round(dollars * 100);
}

function readSearchText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length > 100) throw badRequest('Search text must be at most 100 characters.');
  return value.trim() || undefined;
}

function body(req: Request): Record<string, unknown> {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
}

function cartResponse(db: Db, userId: number) {
  const items = listCart(db, userId).map((line) => ({ ...line, lineTotalCents: line.priceCents * line.quantity }));
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    totalCents: items.reduce((sum, item) => sum + item.lineTotalCents, 0),
  };
}

/** Checks a requested cart quantity against the product's current stock. */
function assertStockFor(db: Db, productId: number, quantity: number) {
  const product = getProduct(db, productId);
  if (!product) throw notFound('Product not found.');
  if (product.stock === 0) throw conflict('OUT_OF_STOCK', `${product.name} is out of stock.`);
  if (quantity > product.stock) {
    throw conflict('INSUFFICIENT_STOCK', `Only ${product.stock} of ${product.name} left in stock.`, { available: product.stock });
  }
  return product;
}

export function createApp(options: AppOptions): express.Express {
  const { db, timings } = options;
  const now = options.now ?? Date.now;
  const app = express();

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '50kb' }));

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const user = token ? userForToken(db, token, now()) : undefined;
    if (!user) return next(unauthorized());
    res.locals.user = user;
    res.locals.token = token;
    next();
  };

  // ---------- Catalog (public) ----------

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/categories', (_req, res) => {
    res.json({ categories: CATEGORIES });
  });

  app.get('/api/products', (req, res) => {
    const products = listProducts(db, {
      q: readSearchText(req.query.q),
      category: readCategory(req.query.category),
      minPriceCents: readOptionalPriceCents(req.query.minPrice, 'Minimum price'),
      maxPriceCents: readOptionalPriceCents(req.query.maxPrice, 'Maximum price'),
    });
    res.json({ products });
  });

  app.get('/api/products/:id', (req, res) => {
    const product = getProduct(db, parsePositiveInt(req.params.id, 'Product id'));
    if (!product) throw notFound('Product not found.');
    res.json({ product });
  });

  // ---------- Accounts ----------

  app.post('/api/auth/signup', async (req, res) => {
    const result = await signup(db, validateSignup(body(req)), now());
    res.status(201).json(result);
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = body(req);
    res.json(await login(db, email, password, now()));
  });

  app.post('/api/auth/logout', requireAuth, (_req, res) => {
    logout(db, auth(res).token);
    res.status(204).end();
  });

  app.get('/api/auth/me', requireAuth, (_req, res) => {
    res.json({ user: auth(res).user });
  });

  // ---------- Cart (own cart only) ----------

  app.get('/api/cart', requireAuth, (_req, res) => {
    res.json(cartResponse(db, auth(res).user.id));
  });

  app.post('/api/cart', requireAuth, (req, res) => {
    const userId = auth(res).user.id;
    const input = body(req);
    const productId = parsePositiveInt(input.productId, 'Product id');
    const quantity = parsePositiveInt(input.quantity ?? 1, 'Quantity');
    const newQuantity = getCartQuantity(db, userId, productId) + quantity;
    assertStockFor(db, productId, newQuantity);
    setCartQuantity(db, userId, productId, newQuantity, now());
    res.status(201).json(cartResponse(db, userId));
  });

  app.patch('/api/cart/:productId', requireAuth, (req, res) => {
    const userId = auth(res).user.id;
    const productId = parsePositiveInt(req.params.productId, 'Product id');
    const quantity = parsePositiveInt(body(req).quantity, 'Quantity');
    if (getCartQuantity(db, userId, productId) === 0) throw notFound('That product is not in your cart.');
    assertStockFor(db, productId, quantity);
    setCartQuantity(db, userId, productId, quantity, now());
    res.json(cartResponse(db, userId));
  });

  app.delete('/api/cart/:productId', requireAuth, (req, res) => {
    const userId = auth(res).user.id;
    const productId = parsePositiveInt(req.params.productId, 'Product id');
    if (!deleteCartLine(db, userId, productId)) throw notFound('That product is not in your cart.');
    res.json(cartResponse(db, userId));
  });

  // ---------- Orders (own orders only) ----------

  app.post('/api/orders', requireAuth, (req, res) => {
    const userId = auth(res).user.id;
    const input = body(req);
    const shipping = validateShipping(input.shipping);
    const buyNow = input.buyNow as Record<string, unknown> | undefined;
    const lines = buyNow
      ? [{ productId: parsePositiveInt(buyNow.productId, 'Product id'), quantity: parsePositiveInt(buyNow.quantity ?? 1, 'Quantity') }]
      : listCart(db, userId).map((line) => ({ productId: line.productId, quantity: line.quantity }));
    const order = placeOrder(db, { userId, lines, shipping, now: now(), fromCart: !buyNow }, timings);
    res.status(201).json({ order });
  });

  app.get('/api/orders', requireAuth, (_req, res) => {
    res.json({ orders: listOrderViews(db, auth(res).user.id, now(), timings) });
  });

  app.get('/api/orders/:id', requireAuth, (req, res) => {
    const orderId = parsePositiveInt(req.params.id, 'Order id');
    res.json({ order: getOrderView(db, auth(res).user.id, orderId, now(), timings) });
  });

  app.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
    const orderId = parsePositiveInt(req.params.id, 'Order id');
    res.json({ order: cancelOrder(db, auth(res).user.id, orderId, now(), timings) });
  });

  // ---------- Shopping assistant (public) ----------

  app.post('/api/assistant', async (req, res) => {
    const message = body(req).message;
    if (typeof message !== 'string' || !message.trim() || message.length > 300) {
      throw badRequest('Tell the assistant what you are looking for (up to 300 characters).');
    }
    res.json(await runAssistant(db, message.trim(), options.assistant, options.fetchImpl ?? fetch));
  });

  app.post('/api/assistant/chat', async (req, res) => {
    const messages = readChatMessages(body(req).messages);
    if (!messages) {
      throw badRequest(
        `Send 1 to ${MAX_CHAT_MESSAGES} messages, each with role "user" or "assistant" and 1 to ${MAX_CHAT_TEXT_LENGTH} characters of text, ending with a user message.`,
      );
    }
    res.json(await runChat(db, messages, options.assistant, options.fetchImpl ?? fetch));
  });

  app.use('/api', (_req, _res, next) => next(notFound('No such API endpoint.')));

  // ---------- Built client (npm start) ----------

  if (options.staticDir && existsSync(join(options.staticDir, 'index.html'))) {
    const indexFile = join(options.staticDir, 'index.html');
    app.use(express.static(options.staticDir));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(indexFile) : next()));
  }

  // ---------- Errors: always JSON with a clear message ----------

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
      return;
    }
    const parseError = error as { type?: string; status?: number };
    if (parseError.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON.' } });
      return;
    }
    if (parseError.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body is too large.' } });
      return;
    }
    console.error('[api] Unexpected error:', error);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on the server. Please try again.' } });
  });

  return app;
}
