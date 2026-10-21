import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { readAssistantConfig, type OrderTimings } from '../server/config';
import { openDatabase, type Db } from '../server/db';
import { getProduct, listProducts, setStock } from '../server/repo';
import { seedProducts } from '../server/seed';

// End-to-end API flow against createApp() on an in-memory database:
// Browse, Sign up / Log in, Add to Cart, Checkout, View Order, plus Buy Now,
// access control, the cancel window, the assistant, and the oversell race.

const TIMINGS: OrderTimings = { shipSeconds: 30, deliverSeconds: 60 };
const shipping = {
  recipientName: 'Ada Shopper',
  address: '42 Demo Lane',
  city: 'Austin',
  postalCode: '73301',
  phone: '+1 512 555 0142',
};

let db: Db;
let clock = Date.UTC(2026, 9, 21, 9, 0, 0);
let app: ReturnType<typeof createApp>;

function uniqueEmail(label: string): string {
  return `${label}-${randomUUID().slice(0, 8)}@example.com`;
}

async function signUp(label: string): Promise<string> {
  const response = await request(app).post('/api/auth/signup').send({ email: uniqueEmail(label), name: label, password: 'correct-horse-1' });
  expect(response.status).toBe(201);
  return response.body.token as string;
}

beforeAll(() => {
  db = openDatabase(':memory:');
  seedProducts(db);
  app = createApp({ db, timings: TIMINGS, assistant: { ...readAssistantConfig({}), bedrockToken: undefined }, now: () => clock });
});

describe('full shopping flow (NFR7)', () => {
  const email = uniqueEmail('flow');
  const password = 'correct-horse-1';
  let token = '';
  let laptopId = 0;
  let mouseId = 0;
  let orderId = 0;

  it('browses the seeded catalog of 20 products in 4 categories (FR1.1, FR1.2)', async () => {
    const response = await request(app).get('/api/products');
    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(20);
    const categories = new Set(response.body.products.map((product: { category: string }) => product.category));
    expect([...categories].sort()).toEqual(['Accessories', 'Desktops', 'Laptops', 'Monitors']);
    expect(response.body.products[0]).toMatchObject({ name: expect.any(String), priceCents: expect.any(Number), image: expect.any(String) });
  });

  it('combines text search with the category filter and returns empty when nothing matches (FR1.3, FR1.4)', async () => {
    const laptops = await request(app).get('/api/products').query({ q: 'gaming', category: 'Laptops' });
    expect(laptops.status).toBe(200);
    expect(laptops.body.products.length).toBeGreaterThan(0);
    for (const product of laptops.body.products) {
      expect(product.category).toBe('Laptops');
      expect(`${product.name} ${product.description}`.toLowerCase()).toContain('gaming');
    }
    laptopId = laptops.body.products[0].id;

    const none = await request(app).get('/api/products').query({ q: 'toaster' });
    expect(none.body.products).toEqual([]);

    const badCategory = await request(app).get('/api/products').query({ category: 'Phones' });
    expect(badCategory.status).toBe(400);
    expect(badCategory.body.error.message).toMatch(/Category must be one of/);
  });

  it('opens a product detail page with stock (FR1.5)', async () => {
    const response = await request(app).get(`/api/products/${laptopId}`);
    expect(response.status).toBe(200);
    expect(response.body.product).toMatchObject({ id: laptopId, category: 'Laptops', stock: expect.any(Number), description: expect.any(String) });
    expect((await request(app).get('/api/products/9999')).status).toBe(404);
  });

  it('refuses the cart and orders without login (FR2.3)', async () => {
    expect((await request(app).get('/api/cart')).status).toBe(401);
    expect((await request(app).post('/api/cart').send({ productId: laptopId })).status).toBe(401);
    expect((await request(app).get('/api/orders')).status).toBe(401);
    expect((await request(app).get('/api/cart').set('Authorization', 'Bearer not-a-real-token')).status).toBe(401);
  });

  it('signs up, rejects a duplicate email, and logs in (FR2.1, FR2.2, FR2.5)', async () => {
    const signup = await request(app).post('/api/auth/signup').send({ email, name: 'Flow Shopper', password });
    expect(signup.status).toBe(201);
    expect(signup.body.user).toMatchObject({ email, name: 'Flow Shopper' });
    expect(signup.body.user).not.toHaveProperty('passwordHash');

    const duplicate = await request(app).post('/api/auth/signup').send({ email, name: 'Again', password });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toMatch(/already exists/);

    const wrong = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.message).toBe('Wrong email or password.');

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    token = login.body.token;
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user.email).toBe(email);
  });

  it('stores the password hashed, never in plain text (FR2.4)', () => {
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(email) as { password_hash: string };
    expect(row.password_hash).not.toContain(password);
    expect(row.password_hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('adds to the cart, changes quantity within stock, and keeps the cart on the server (FR3)', async () => {
    mouseId = listProducts(db, { q: 'Wireless Mouse' })[0].id;
    const auth = { Authorization: `Bearer ${token}` };

    const added = await request(app).post('/api/cart').set(auth).send({ productId: laptopId, quantity: 1 });
    expect(added.status).toBe(201);
    await request(app).post('/api/cart').set(auth).send({ productId: mouseId, quantity: 1 });

    const updated = await request(app).patch(`/api/cart/${mouseId}`).set(auth).send({ quantity: 3 });
    expect(updated.status).toBe(200);
    expect(updated.body.count).toBe(4);

    const tooMany = await request(app).patch(`/api/cart/${laptopId}`).set(auth).send({ quantity: 999 });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.message).toMatch(/left in stock/);
    expect((await request(app).patch(`/api/cart/${laptopId}`).set(auth).send({ quantity: 0 })).status).toBe(400);

    const cart = await request(app).get('/api/cart').set(auth);
    const laptop = getProduct(db, laptopId)!;
    const mouse = getProduct(db, mouseId)!;
    expect(cart.body.items).toHaveLength(2);
    expect(cart.body.totalCents).toBe(laptop.priceCents + mouse.priceCents * 3);
  });

  it('rejects checkout with missing shipping information (FR4.1)', async () => {
    const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ shipping: { ...shipping, city: '' } });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/City is required/);
  });

  it('checks out: order is Paid, stock reserved, cart emptied (FR4.2 to FR4.4)', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const laptopStock = getProduct(db, laptopId)!.stock;
    const mouseStock = getProduct(db, mouseId)!.stock;

    const response = await request(app).post('/api/orders').set(auth).send({ shipping });
    expect(response.status).toBe(201);
    expect(response.body.order.status).toBe('Paid');
    orderId = response.body.order.id;

    expect(getProduct(db, laptopId)!.stock).toBe(laptopStock - 1);
    expect(getProduct(db, mouseId)!.stock).toBe(mouseStock - 3);
    expect((await request(app).get('/api/cart').set(auth)).body.items).toEqual([]);
  });

  it('views the order in My Orders with items, amount, shipping and status (FR6.1, FR6.2)', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const list = await request(app).get('/api/orders').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.orders).toHaveLength(1);

    const detail = await request(app).get(`/api/orders/${orderId}`).set(auth);
    const order = detail.body.order;
    expect(order.status).toBe('Paid');
    expect(order.shipping).toEqual(shipping);
    expect(order.items).toHaveLength(2);
    const itemTotal = order.items.reduce((sum: number, item: { lineTotalCents: number }) => sum + item.lineTotalCents, 0);
    expect(order.totalCents).toBe(itemTotal);
    expect(order.items.find((item: { productId: number }) => item.productId === mouseId)).toMatchObject({ quantity: 3 });
  });

  it('advances the order to Shipped and Delivered on the server clock (FR5.2, FR5.5)', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const start = clock;
    clock = start + 30_000;
    expect((await request(app).get(`/api/orders/${orderId}`).set(auth)).body.order.status).toBe('Shipped');
    const refused = await request(app).post(`/api/orders/${orderId}/cancel`).set(auth);
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toMatch(/Shipped and can no longer be cancelled/);
    clock = start + 60_000;
    expect((await request(app).get(`/api/orders/${orderId}`).set(auth)).body.order.status).toBe('Delivered');
  });

  it('buys now from the detail page without touching the cart, lists newest first, and cancels in the window (FR4.5, FR5.3, FR6.1)', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/cart').set(auth).send({ productId: mouseId, quantity: 1 });
    const monitorId = listProducts(db, { category: 'Monitors' })[0].id;
    const monitorStock = getProduct(db, monitorId)!.stock;

    clock += 1_000;
    const buyNow = await request(app).post('/api/orders').set(auth).send({ shipping, buyNow: { productId: monitorId, quantity: 2 } });
    expect(buyNow.status).toBe(201);
    expect(buyNow.body.order.items).toEqual([expect.objectContaining({ productId: monitorId, quantity: 2 })]);
    expect((await request(app).get('/api/cart').set(auth)).body.count).toBe(1);

    const list = await request(app).get('/api/orders').set(auth);
    expect(list.body.orders.map((order: { id: number }) => order.id)).toEqual([buyNow.body.order.id, orderId]);

    const cancelled = await request(app).post(`/api/orders/${buyNow.body.order.id}/cancel`).set(auth);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order.status).toBe('Cancelled');
    expect(getProduct(db, monitorId)!.stock).toBe(monitorStock);
  });

  it("never shows another shopper's order or cart (FR6.4, NFR5)", async () => {
    const otherToken = await signUp('other');
    const other = { Authorization: `Bearer ${otherToken}` };
    const peek = await request(app).get(`/api/orders/${orderId}`).set(other);
    expect(peek.status).toBe(404);
    expect((await request(app).post(`/api/orders/${orderId}/cancel`).set(other)).status).toBe(404);
    expect((await request(app).get('/api/orders').set(other)).body.orders).toEqual([]);
    expect((await request(app).get('/api/cart').set(other)).body.items).toEqual([]);
  });

  it('logs out and the token stops working (FR2.2)', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).post('/api/auth/logout').set(auth)).status).toBe(204);
    expect((await request(app).get('/api/cart').set(auth)).status).toBe(401);
  });
});

describe('overselling protection (FR4.3, FR8)', () => {
  it('lets exactly one of two simultaneous orders take the last unit', async () => {
    const [first, second] = await Promise.all([signUp('racer-a'), signUp('racer-b')]);
    const productId = listProducts(db, { q: 'Workstation', category: 'Desktops' })[0].id;
    setStock(db, productId, 1);

    const responses = await Promise.all(
      [first, second].map((token) =>
        request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ shipping, buyNow: { productId, quantity: 1 } }),
      ),
    );
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    const loser = responses.find((response) => response.status === 409)!;
    expect(loser.body.error.code).toBe('OUT_OF_STOCK');
    expect(loser.body.error.message).toMatch(/Not enough stock/);
    expect(getProduct(db, productId)!.stock).toBe(0);
  });

  it('creates no partial order when one line of a multi-line cart is short', async () => {
    const token = await signUp('partial');
    const auth = { Authorization: `Bearer ${token}` };
    const [plentiful, scarce] = listProducts(db, { category: 'Accessories' });
    await request(app).post('/api/cart').set(auth).send({ productId: plentiful.id, quantity: 1 });
    await request(app).post('/api/cart').set(auth).send({ productId: scarce.id, quantity: 2 });
    setStock(db, scarce.id, 1);
    const plentifulStock = getProduct(db, plentiful.id)!.stock;

    const response = await request(app).post('/api/orders').set(auth).send({ shipping });
    expect(response.status).toBe(409);
    expect(response.body.error.details[0]).toMatchObject({ productId: scarce.id, available: 1 });
    expect(getProduct(db, plentiful.id)!.stock).toBe(plentifulStock);
    expect((await request(app).get('/api/orders').set(auth)).body.orders).toEqual([]);
    expect((await request(app).get('/api/cart').set(auth)).body.items).toHaveLength(2);
  });
});

describe('shopping assistant without a Bedrock key (FR7)', () => {
  it('uses the rule-based parser, shows the filters, and returns catalog products only', async () => {
    const response = await request(app).post('/api/assistant').send({ message: 'gaming laptop under 1500' });
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('rules');
    expect(response.body.filters).toEqual({ category: 'Laptops', maxPrice: 1500, keywords: ['gaming'] });
    expect(response.body.products.length).toBeGreaterThan(0);
    for (const product of response.body.products) {
      expect(product.category).toBe('Laptops');
      expect(product.priceCents).toBeLessThanOrEqual(150000);
      expect(getProduct(db, product.id)).toBeDefined();
    }
  });

  it('rejects an empty request', async () => {
    expect((await request(app).post('/api/assistant').send({ message: '  ' })).status).toBe(400);
  });
});

describe('persistence across a restart (NFR1)', () => {
  const dbFile = join(process.cwd(), 'data', `test-persist-${randomUUID()}.db`);

  afterAll(() => {
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbFile}${suffix}`, { force: true });
  });

  it('keeps users, carts and stock in the database file after reopening it', async () => {
    const first = openDatabase(dbFile);
    expect(seedProducts(first)).toBe(20);
    const firstApp = createApp({ db: first, timings: TIMINGS, assistant: readAssistantConfig({}) });
    const signup = await request(firstApp).post('/api/auth/signup').send({ email: uniqueEmail('persist'), name: 'P', password: 'correct-horse-1' });
    await request(firstApp).post('/api/cart').set('Authorization', `Bearer ${signup.body.token}`).send({ productId: 1, quantity: 2 });
    setStock(first, 2, 7);
    first.close();

    const reopened = openDatabase(dbFile);
    expect(seedProducts(reopened)).toBe(0);
    const secondApp = createApp({ db: reopened, timings: TIMINGS, assistant: readAssistantConfig({}) });
    const cart = await request(secondApp).get('/api/cart').set('Authorization', `Bearer ${signup.body.token}`);
    expect(cart.status).toBe(200);
    expect(cart.body.items).toEqual([expect.objectContaining({ productId: 1, quantity: 2 })]);
    expect(getProduct(reopened, 2)!.stock).toBe(7);
    reopened.close();
  });
});
