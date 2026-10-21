import type { OrderTimings } from './config';
import { inTransaction, type Db } from './db';
import { badRequest, conflict, notFound } from './errors';
import {
  clearCart,
  decrementStockIfAvailable,
  getOrderForUser,
  getProduct,
  incrementStock,
  insertOrder,
  insertOrderItem,
  listOrderItems,
  listOrdersForUser,
  updateOrderStatus,
  type OrderItemRecord,
  type OrderRecord,
  type OrderStatus,
  type ShippingInfo,
} from './repo';

export const ORDER_STATUSES: readonly OrderStatus[] = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'];

export interface OrderLineInput {
  productId: number;
  quantity: number;
}

export interface OrderView {
  id: number;
  status: OrderStatus;
  totalCents: number;
  placedAt: string;
  shipsAt: string;
  deliversAt: string;
  canCancel: boolean;
  shipping: ShippingInfo;
  items: (OrderItemRecord & { lineTotalCents: number })[];
}

// ---------- Pure lifecycle rules ----------

/**
 * The status an order has at `now`. Paid orders move to Shipped and then
 * Delivered purely by elapsed time since placement; Cancelled and Pending
 * stay as stored. Status never moves backwards.
 */
export function deriveStatus(order: Pick<OrderRecord, 'status' | 'placedAt'>, now: number, timings: OrderTimings): OrderStatus {
  if (order.status === 'Cancelled' || order.status === 'Pending' || order.status === 'Delivered') return order.status;
  const elapsedSeconds = (now - order.placedAt) / 1000;
  if (elapsedSeconds >= timings.deliverSeconds) return 'Delivered';
  if (elapsedSeconds >= timings.shipSeconds || order.status === 'Shipped') return 'Shipped';
  return 'Paid';
}

/** Only orders that have not shipped yet can be cancelled. */
export function canCancel(status: OrderStatus): boolean {
  return status === 'Pending' || status === 'Paid';
}

// ---------- Input validation ----------

const SHIPPING_FIELDS: { key: keyof ShippingInfo; label: string; max: number }[] = [
  { key: 'recipientName', label: 'Recipient name', max: 100 },
  { key: 'address', label: 'Address', max: 200 },
  { key: 'city', label: 'City', max: 100 },
  { key: 'postalCode', label: 'Postal code', max: 20 },
  { key: 'phone', label: 'Phone', max: 30 },
];

export function validateShipping(input: unknown): ShippingInfo {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const shipping = {} as ShippingInfo;
  const problems: { field: string; reason: string }[] = [];
  for (const field of SHIPPING_FIELDS) {
    const value = typeof source[field.key] === 'string' ? (source[field.key] as string).trim() : '';
    if (!value || value.length > field.max) problems.push({ field: field.key, reason: `${field.label} is required (max ${field.max} characters).` });
    shipping[field.key] = value;
  }
  if (shipping.phone && !/^[0-9+()\-.\s]{5,30}$/.test(shipping.phone)) {
    problems.push({ field: 'phone', reason: 'Phone may contain only digits, spaces and + ( ) - .' });
  }
  if (problems.length > 0) throw badRequest(problems.map((problem) => problem.reason).join(' '), problems);
  return shipping;
}

export function parsePositiveInt(value: unknown, label: string): number {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1 || number > 1_000_000) {
    throw badRequest(`${label} must be a whole number of at least 1.`);
  }
  return number;
}

/** Merges duplicate product lines so each product is reserved once. */
function mergeLines(lines: OrderLineInput[]): OrderLineInput[] {
  const totals = new Map<number, number>();
  for (const line of lines) totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
  return [...totals].map(([productId, quantity]) => ({ productId, quantity }));
}

// ---------- Views ----------

function toView(order: OrderRecord, items: OrderItemRecord[], timings: OrderTimings): OrderView {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    placedAt: new Date(order.placedAt).toISOString(),
    shipsAt: new Date(order.placedAt + timings.shipSeconds * 1000).toISOString(),
    deliversAt: new Date(order.placedAt + timings.deliverSeconds * 1000).toISOString(),
    canCancel: canCancel(order.status),
    shipping: order.shipping,
    items: items.map((item) => ({ ...item, lineTotalCents: item.unitPriceCents * item.quantity })),
  };
}

/** Brings the stored status up to date with the clock and writes it back when it changed. */
function refreshStatus(db: Db, order: OrderRecord, now: number, timings: OrderTimings): OrderRecord {
  const status = deriveStatus(order, now, timings);
  if (status === order.status) return order;
  updateOrderStatus(db, order.id, status);
  return { ...order, status };
}

export function getOrderView(db: Db, userId: number, orderId: number, now: number, timings: OrderTimings): OrderView {
  const order = getOrderForUser(db, orderId, userId);
  if (!order) throw notFound('Order not found.');
  return toView(refreshStatus(db, order, now, timings), listOrderItems(db, order.id), timings);
}

export function listOrderViews(db: Db, userId: number, now: number, timings: OrderTimings): OrderView[] {
  return listOrdersForUser(db, userId).map((order) => toView(refreshStatus(db, order, now, timings), listOrderItems(db, order.id), timings));
}

// ---------- Commands ----------

export interface PlaceOrderInput {
  userId: number;
  lines: OrderLineInput[];
  shipping: ShippingInfo;
  now: number;
  /** True when the order comes from the cart, which is emptied in the same transaction. */
  fromCart: boolean;
}

interface Shortage {
  productId: number;
  name: string;
  requested: number;
  available: number;
}

/**
 * Places an order and reserves stock for every line in one BEGIN IMMEDIATE
 * transaction. Each line's stock is decremented only if enough remains; if
 * any line falls short, everything rolls back and no order is created.
 */
export function placeOrder(db: Db, input: PlaceOrderInput, timings: OrderTimings): OrderView {
  const lines = mergeLines(input.lines);
  if (lines.length === 0) throw badRequest('Your cart is empty.');
  const orderId = inTransaction(db, () => {
    const items: OrderItemRecord[] = [];
    const shortages: Shortage[] = [];
    for (const line of lines) {
      const product = getProduct(db, line.productId);
      if (!product) throw notFound(`Product ${line.productId} does not exist.`);
      if (!decrementStockIfAvailable(db, product.id, line.quantity)) {
        shortages.push({ productId: product.id, name: product.name, requested: line.quantity, available: product.stock });
        continue;
      }
      items.push({ productId: product.id, name: product.name, unitPriceCents: product.priceCents, quantity: line.quantity });
    }
    if (shortages.length > 0) {
      const summary = shortages.map((short) => `${short.name} (only ${short.available} left)`).join(', ');
      throw conflict('OUT_OF_STOCK', `Not enough stock for: ${summary}. No order was placed.`, shortages);
    }
    const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
    // Payment is simulated and always succeeds, so the order starts as Paid.
    const id = insertOrder(db, { userId: input.userId, status: 'Paid', totalCents, placedAt: input.now, shipping: input.shipping });
    for (const item of items) insertOrderItem(db, id, item);
    if (input.fromCart) clearCart(db, input.userId);
    return id;
  });
  return getOrderView(db, input.userId, orderId, input.now, timings);
}

/**
 * Cancels the shopper's own order if, at `now`, it has not shipped yet.
 * The cancellation and the stock return happen in one transaction.
 */
export function cancelOrder(db: Db, userId: number, orderId: number, now: number, timings: OrderTimings): OrderView {
  inTransaction(db, () => {
    const order = getOrderForUser(db, orderId, userId);
    if (!order) throw notFound('Order not found.');
    const status = deriveStatus(order, now, timings);
    if (!canCancel(status)) {
      throw conflict('CANNOT_CANCEL', `This order is ${status} and can no longer be cancelled.`, { status });
    }
    for (const item of listOrderItems(db, order.id)) incrementStock(db, item.productId, item.quantity);
    updateOrderStatus(db, order.id, 'Cancelled', now);
  });
  return getOrderView(db, userId, orderId, now, timings);
}
