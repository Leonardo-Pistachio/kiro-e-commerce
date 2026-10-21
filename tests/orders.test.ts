import { beforeEach, describe, expect, it } from 'vitest';
import { parseRules, validateFilters } from '../server/assistant';
import type { OrderTimings } from '../server/config';
import { openDatabase, type Db } from '../server/db';
import { canCancel, cancelOrder, deriveStatus, placeOrder } from '../server/orders';
import { getProduct, insertUser, type ShippingInfo } from '../server/repo';
import { seedProducts } from '../server/seed';

const TIMINGS: OrderTimings = { shipSeconds: 30, deliverSeconds: 60 };
const PLACED_AT = Date.UTC(2026, 0, 1, 12, 0, 0);
const SECOND = 1000;

const shipping: ShippingInfo = {
  recipientName: 'Test Shopper',
  address: '1 Test Street',
  city: 'Testville',
  postalCode: '12345',
  phone: '+1 555 0100',
};

describe('order status derivation (FR5.2)', () => {
  const paidOrder = { status: 'Paid' as const, placedAt: PLACED_AT };

  it('is Paid at placement', () => {
    expect(deriveStatus(paidOrder, PLACED_AT, TIMINGS)).toBe('Paid');
    expect(deriveStatus(paidOrder, PLACED_AT + 29 * SECOND, TIMINGS)).toBe('Paid');
  });

  it('is Shipped 30 seconds after placement', () => {
    expect(deriveStatus(paidOrder, PLACED_AT + 30 * SECOND, TIMINGS)).toBe('Shipped');
    expect(deriveStatus(paidOrder, PLACED_AT + 59 * SECOND, TIMINGS)).toBe('Shipped');
  });

  it('is Delivered 60 seconds after placement', () => {
    expect(deriveStatus(paidOrder, PLACED_AT + 60 * SECOND, TIMINGS)).toBe('Delivered');
  });

  it('never moves a Cancelled order', () => {
    expect(deriveStatus({ status: 'Cancelled', placedAt: PLACED_AT }, PLACED_AT + 120 * SECOND, TIMINGS)).toBe('Cancelled');
  });
});

describe('cancel rules (FR5.3, FR5.4)', () => {
  let db: Db;
  let userId: number;

  beforeEach(() => {
    db = openDatabase(':memory:');
    seedProducts(db);
    userId = insertUser(db, { email: 'rules@example.com', name: 'Rules', passwordHash: 'x', passwordSalt: 'y' }, PLACED_AT);
  });

  it('allows cancel only before Shipped', () => {
    expect(canCancel('Pending')).toBe(true);
    expect(canCancel('Paid')).toBe(true);
    expect(canCancel('Shipped')).toBe(false);
    expect(canCancel('Delivered')).toBe(false);
    expect(canCancel('Cancelled')).toBe(false);
  });

  it('cancels a Paid order and returns its stock', () => {
    const before = getProduct(db, 1)!.stock;
    const order = placeOrder(db, { userId, lines: [{ productId: 1, quantity: 2 }], shipping, now: PLACED_AT, fromCart: false }, TIMINGS);
    expect(getProduct(db, 1)!.stock).toBe(before - 2);

    const cancelled = cancelOrder(db, userId, order.id, PLACED_AT + 10 * SECOND, TIMINGS);
    expect(cancelled.status).toBe('Cancelled');
    expect(cancelled.canCancel).toBe(false);
    expect(getProduct(db, 1)!.stock).toBe(before);
  });

  it('refuses to cancel once the order has shipped and keeps the stock reserved', () => {
    const order = placeOrder(db, { userId, lines: [{ productId: 1, quantity: 1 }], shipping, now: PLACED_AT, fromCart: false }, TIMINGS);
    const stockAfterOrder = getProduct(db, 1)!.stock;
    expect(() => cancelOrder(db, userId, order.id, PLACED_AT + 30 * SECOND, TIMINGS)).toThrowError(/Shipped and can no longer be cancelled/);
    expect(getProduct(db, 1)!.stock).toBe(stockAfterOrder);
  });

  it('refuses to cancel an order twice', () => {
    const order = placeOrder(db, { userId, lines: [{ productId: 2, quantity: 1 }], shipping, now: PLACED_AT, fromCart: false }, TIMINGS);
    cancelOrder(db, userId, order.id, PLACED_AT + SECOND, TIMINGS);
    expect(() => cancelOrder(db, userId, order.id, PLACED_AT + 2 * SECOND, TIMINGS)).toThrowError(/Cancelled/);
  });
});

describe('assistant rule-based parser (FR7.3)', () => {
  it('turns "gaming laptop under 1500" into Laptops with max price 1500', () => {
    const filters = parseRules('gaming laptop under 1500');
    expect(filters.category).toBe('Laptops');
    expect(filters.maxPrice).toBe(1500);
    expect(filters.minPrice).toBeUndefined();
    expect(filters.keywords).toEqual(['gaming']);
  });

  it('reads price ranges and accessory items', () => {
    expect(parseRules('wireless mouse between $20 and $50')).toEqual({ category: 'Accessories', minPrice: 20, maxPrice: 50, keywords: ['wireless', 'mouse'] });
    expect(parseRules('4k monitor over 1k')).toEqual({ category: 'Monitors', minPrice: 1000, keywords: ['4k'] });
  });

  it('rejects malformed model output so the rules can take over', () => {
    expect(validateFilters({ category: 'Phones' })).toBeNull();
    expect(validateFilters({ maxPrice: 'cheap' })).toBeNull();
    expect(validateFilters({ minPrice: 900, maxPrice: 100 })).toBeNull();
    expect(validateFilters(['Laptops'])).toBeNull();
    expect(validateFilters({ category: 'laptops', maxPrice: 1500, keywords: ['Gaming'] })).toEqual({ category: 'Laptops', maxPrice: 1500, keywords: ['gaming'] });
  });
});
