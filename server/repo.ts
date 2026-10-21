import type { Db } from './db';
import type { Category } from './seed';

// Typed data access. Every query uses prepared statements with bound
// parameters; no user input is ever concatenated into SQL.

export type OrderStatus = 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: Category;
  priceCents: number;
  stock: number;
  image: string;
}

export interface ProductFilters {
  q?: string;
  category?: Category;
  minPriceCents?: number;
  maxPriceCents?: number;
  /** Any keyword matching name or description qualifies a product. */
  keywords?: string[];
}

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
}

export interface CartLine {
  productId: number;
  name: string;
  image: string;
  priceCents: number;
  stock: number;
  quantity: number;
}

export interface ShippingInfo {
  recipientName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
}

export interface OrderRecord {
  id: number;
  userId: number;
  status: OrderStatus;
  totalCents: number;
  placedAt: number;
  cancelledAt: number | null;
  shipping: ShippingInfo;
}

export interface OrderItemRecord {
  productId: number;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

type Row = Record<string, unknown>;

const PRODUCT_COLUMNS = 'id, name, description, category, price_cents, stock, image';

function toProduct(row: Row): Product {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    category: row.category as Category,
    priceCents: Number(row.price_cents),
    stock: Number(row.stock),
    image: String(row.image),
  };
}

/** Escapes LIKE wildcards so user text is matched literally. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

// ---------- Products ----------

export function listProducts(db: Db, filters: ProductFilters = {}): Product[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.q) {
    clauses.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    params.push(likePattern(filters.q), likePattern(filters.q));
  }
  if (filters.category) {
    clauses.push('category = ?');
    params.push(filters.category);
  }
  if (filters.minPriceCents !== undefined) {
    clauses.push('price_cents >= ?');
    params.push(filters.minPriceCents);
  }
  if (filters.maxPriceCents !== undefined) {
    clauses.push('price_cents <= ?');
    params.push(filters.maxPriceCents);
  }
  if (filters.keywords && filters.keywords.length > 0) {
    const anyKeyword = filters.keywords.map(() => "(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    clauses.push(`(${anyKeyword.join(' OR ')})`);
    for (const keyword of filters.keywords) params.push(likePattern(keyword), likePattern(keyword));
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products ${where} ORDER BY category, price_cents`).all(...params);
  return rows.map(toProduct);
}

export function getProduct(db: Db, id: number): Product | undefined {
  const row = db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`).get(id);
  return row ? toProduct(row) : undefined;
}

/** Decrements stock only when enough is left. Returns false when it was not. */
export function decrementStockIfAvailable(db: Db, productId: number, quantity: number): boolean {
  const result = db
    .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
    .run(quantity, productId, quantity);
  return Number(result.changes) === 1;
}

export function incrementStock(db: Db, productId: number, quantity: number): void {
  db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, productId);
}

export function setStock(db: Db, productId: number, stock: number): void {
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, productId);
}

// ---------- Users and sessions ----------

function toUser(row: Row): UserRecord {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    passwordHash: String(row.password_hash),
    passwordSalt: String(row.password_salt),
  };
}

export function insertUser(db: Db, user: Omit<UserRecord, 'id'>, now: number): number {
  const result = db
    .prepare('INSERT INTO users (email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.email, user.name, user.passwordHash, user.passwordSalt, now);
  return Number(result.lastInsertRowid);
}

export function findUserByEmail(db: Db, email: string): UserRecord | undefined {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  return row ? toUser(row) : undefined;
}

export function insertSession(db: Db, token: string, userId: number, now: number, expiresAt: number): void {
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, expiresAt);
}

export function findSessionUser(db: Db, token: string, now: number): UserRecord | undefined {
  const row = db
    .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?')
    .get(token, now);
  return row ? toUser(row) : undefined;
}

export function deleteSession(db: Db, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ---------- Cart ----------

export function listCart(db: Db, userId: number): CartLine[] {
  const rows = db
    .prepare(
      `SELECT c.product_id, c.quantity, p.name, p.image, p.price_cents, p.stock
         FROM cart_items c JOIN products p ON p.id = c.product_id
        WHERE c.user_id = ? ORDER BY c.added_at`,
    )
    .all(userId);
  return rows.map((row) => ({
    productId: Number(row.product_id),
    name: String(row.name),
    image: String(row.image),
    priceCents: Number(row.price_cents),
    stock: Number(row.stock),
    quantity: Number(row.quantity),
  }));
}

export function getCartQuantity(db: Db, userId: number, productId: number): number {
  const row = db.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId);
  return row ? Number(row.quantity) : 0;
}

export function setCartQuantity(db: Db, userId: number, productId: number, quantity: number, now: number): void {
  db.prepare(
    `INSERT INTO cart_items (user_id, product_id, quantity, added_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = excluded.quantity`,
  ).run(userId, productId, quantity, now);
}

export function deleteCartLine(db: Db, userId: number, productId: number): boolean {
  const result = db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
  return Number(result.changes) > 0;
}

export function clearCart(db: Db, userId: number): void {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
}

// ---------- Orders ----------

function toOrder(row: Row): OrderRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    status: row.status as OrderStatus,
    totalCents: Number(row.total_cents),
    placedAt: Number(row.placed_at),
    cancelledAt: row.cancelled_at === null ? null : Number(row.cancelled_at),
    shipping: {
      recipientName: String(row.recipient_name),
      address: String(row.address),
      city: String(row.city),
      postalCode: String(row.postal_code),
      phone: String(row.phone),
    },
  };
}

export function insertOrder(db: Db, order: Omit<OrderRecord, 'id' | 'cancelledAt'>): number {
  const { shipping } = order;
  const result = db
    .prepare(
      `INSERT INTO orders (user_id, status, total_cents, placed_at, recipient_name, address, city, postal_code, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(order.userId, order.status, order.totalCents, order.placedAt, shipping.recipientName, shipping.address, shipping.city, shipping.postalCode, shipping.phone);
  return Number(result.lastInsertRowid);
}

export function insertOrderItem(db: Db, orderId: number, item: OrderItemRecord): void {
  db.prepare('INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)').run(
    orderId,
    item.productId,
    item.name,
    item.unitPriceCents,
    item.quantity,
  );
}

/** Returns the order only when it belongs to `userId`. */
export function getOrderForUser(db: Db, orderId: number, userId: number): OrderRecord | undefined {
  const row = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
  return row ? toOrder(row) : undefined;
}

export function listOrdersForUser(db: Db, userId: number): OrderRecord[] {
  return db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY placed_at DESC, id DESC').all(userId).map(toOrder);
}

export function listOrderItems(db: Db, orderId: number): OrderItemRecord[] {
  const rows = db.prepare('SELECT product_id, name, unit_price_cents, quantity FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
  return rows.map((row) => ({
    productId: Number(row.product_id),
    name: String(row.name),
    unitPriceCents: Number(row.unit_price_cents),
    quantity: Number(row.quantity),
  }));
}

export function updateOrderStatus(db: Db, orderId: number, status: OrderStatus, cancelledAt: number | null = null): void {
  db.prepare('UPDATE orders SET status = ?, cancelled_at = COALESCE(?, cancelled_at) WHERE id = ?').run(status, cancelledAt, orderId);
}
