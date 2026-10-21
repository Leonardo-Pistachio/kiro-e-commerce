import type { Db } from './db';

export const CATEGORIES = ['Laptops', 'Desktops', 'Monitors', 'Accessories'] as const;
export type Category = (typeof CATEGORIES)[number];

interface SeedProduct {
  name: string;
  description: string;
  category: Category;
  priceCents: number;
  stock: number;
}

/** The shared per-category drawings every product used before each got its own. */
const LEGACY_IMAGE_BY_CATEGORY: Record<Category, string> = {
  Laptops: '/images/laptops.svg',
  Desktops: '/images/desktops.svg',
  Monitors: '/images/monitors.svg',
  Accessories: '/images/accessories.svg',
};

/** Each seeded product has its own drawing at /images/products/<slug>.svg. */
export function productImagePath(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/images/products/${slug}.svg`;
}

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  // Laptops
  { name: 'Aero 14 Ultrabook', description: 'Thin and light 14-inch laptop with Intel Core Ultra 7, 16 GB RAM and 1 TB SSD. All-day battery for work and travel.', category: 'Laptops', priceCents: 109900, stock: 8 },
  { name: 'Raptor 15 Gaming Laptop', description: 'Gaming laptop with RTX 4060, Ryzen 7, 16 GB RAM and a 15.6-inch 165 Hz display.', category: 'Laptops', priceCents: 139900, stock: 5 },
  { name: 'Raptor 17 Pro Gaming Laptop', description: 'Flagship 17-inch gaming laptop with RTX 4080, Core i9, 32 GB RAM and a 240 Hz QHD display.', category: 'Laptops', priceCents: 249900, stock: 3 },
  { name: 'StudyBook 13', description: 'Affordable 13-inch student laptop with Ryzen 5, 8 GB RAM and 512 GB SSD.', category: 'Laptops', priceCents: 54900, stock: 12 },
  { name: 'Creator 16 Laptop', description: 'Laptop for creators with a 16-inch OLED display, RTX 4070, 32 GB RAM and 2 TB SSD.', category: 'Laptops', priceCents: 219900, stock: 4 },
  // Desktops
  { name: 'Titan X Gaming Desktop', description: 'Gaming tower PC with RTX 4080 Super, Core i7, 32 GB RAM and liquid cooling.', category: 'Desktops', priceCents: 249900, stock: 4 },
  { name: 'Nova Mini PC', description: 'Compact mini desktop with Ryzen 7, 16 GB RAM and 1 TB SSD. Fits behind a monitor.', category: 'Desktops', priceCents: 64900, stock: 10 },
  { name: 'Office Pro Tower', description: 'Quiet office desktop with Core i5, 16 GB RAM and 512 GB SSD, ready for business apps.', category: 'Desktops', priceCents: 79900, stock: 9 },
  { name: 'Vortex Budget Gaming PC', description: 'Entry gaming desktop with RTX 4060, Ryzen 5 and 16 GB RAM for 1080p play.', category: 'Desktops', priceCents: 109900, stock: 6 },
  { name: 'Studio Workstation', description: 'Workstation desktop with Threadripper, 64 GB RAM and RTX 4000 Ada for 3D and video.', category: 'Desktops', priceCents: 389900, stock: 2 },
  // Monitors
  { name: 'ClearView 24 Monitor', description: '24-inch 1080p IPS monitor with slim bezels, ideal for home office.', category: 'Monitors', priceCents: 14900, stock: 20 },
  { name: 'ClearView 27 QHD Monitor', description: '27-inch QHD IPS monitor with USB-C power delivery and height-adjustable stand.', category: 'Monitors', priceCents: 32900, stock: 14 },
  { name: 'Velocity 27 Gaming Monitor', description: '27-inch 240 Hz gaming monitor with 1 ms response and G-Sync compatibility.', category: 'Monitors', priceCents: 44900, stock: 7 },
  { name: 'UltraWide 34 Curved Monitor', description: '34-inch curved ultrawide WQHD monitor for multitasking and immersive games.', category: 'Monitors', priceCents: 59900, stock: 5 },
  { name: 'ProColor 32 4K Monitor', description: '32-inch 4K monitor with 99% Adobe RGB for photo and video editing.', category: 'Monitors', priceCents: 89900, stock: 3 },
  // Accessories
  { name: 'MechType Mechanical Keyboard', description: 'Wired mechanical keyboard with hot-swappable switches and RGB backlight.', category: 'Accessories', priceCents: 8900, stock: 25 },
  { name: 'Glide Wireless Mouse', description: 'Ergonomic wireless mouse with silent clicks and a 70-day battery.', category: 'Accessories', priceCents: 3900, stock: 40 },
  { name: 'Echo Gaming Headset', description: 'Gaming headset with 7.1 surround sound and a detachable noise-cancelling mic.', category: 'Accessories', priceCents: 7900, stock: 18 },
  { name: 'StreamCam 1080p Webcam', description: '1080p 60 fps webcam with autofocus and dual microphones for calls and streaming.', category: 'Accessories', priceCents: 6900, stock: 15 },
  { name: 'Hub 10-in-1 USB-C Dock', description: 'USB-C docking station with dual HDMI, Ethernet, SD reader and 100 W pass-through charging.', category: 'Accessories', priceCents: 12900, stock: 11 },
];

/** Inserts the catalog only when the products table is empty, so restarts keep stock and orders. */
export function seedProducts(db: Db): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
  if (row.count > 0) return 0;
  const insert = db.prepare(
    'INSERT INTO products (name, description, category, price_cents, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
  );
  db.exec('BEGIN');
  try {
    for (const product of SEED_PRODUCTS) {
      insert.run(product.name, product.description, product.category, product.priceCents, product.stock, productImagePath(product.name));
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return SEED_PRODUCTS.length;
}

/**
 * Moves seeded products in an existing database from the shared category
 * drawing to their own image. Only rows still on the legacy path change, so
 * stock, orders and any image set by hand are left alone. Safe to run on every start.
 */
export function upgradeSeedImages(db: Db): number {
  const update = db.prepare('UPDATE products SET image = ? WHERE name = ? AND image = ?');
  let changed = 0;
  db.exec('BEGIN');
  try {
    for (const product of SEED_PRODUCTS) {
      const result = update.run(productImagePath(product.name), product.name, LEGACY_IMAGE_BY_CATEGORY[product.category]);
      changed += Number(result.changes);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return changed;
}
