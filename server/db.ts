import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  password_salt TEXT    NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL,
  category    TEXT    NOT NULL CHECK (category IN ('Laptops', 'Desktops', 'Monitors', 'Accessories')),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stock       INTEGER NOT NULL CHECK (stock >= 0),
  image       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity >= 1),
  added_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  status         TEXT    NOT NULL CHECK (status IN ('Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled')),
  total_cents    INTEGER NOT NULL,
  placed_at      INTEGER NOT NULL,
  cancelled_at   INTEGER,
  recipient_name TEXT    NOT NULL,
  address        TEXT    NOT NULL,
  city           TEXT    NOT NULL,
  postal_code    TEXT    NOT NULL,
  phone          TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, placed_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  name             TEXT    NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity >= 1)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`;

/**
 * Opens (or creates) the store database and makes sure the schema exists.
 * Pass ':memory:' for an isolated throwaway database (tests).
 */
export function openDatabase(path: string): Db {
  const isMemory = path === ':memory:';
  try {
    if (!isMemory) mkdirSync(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    if (!isMemory) db.exec('PRAGMA journal_mode = WAL;');
    db.exec(SCHEMA);
    return db;
  } catch (error) {
    throw new Error(`Could not open the store database at ${path}: ${(error as Error).message}`, {
      cause: error,
    });
  }
}

/**
 * Runs `work` inside one BEGIN IMMEDIATE transaction: the write lock is taken
 * up front, so concurrent writers queue instead of interleaving. Any thrown
 * error rolls the whole transaction back and is re-thrown.
 */
export function inTransaction<T>(db: Db, work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
