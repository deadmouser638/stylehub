const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let dbPath = path.resolve(__dirname, 'database.sqlite');

if (isVercel) {
  const tmpPath = path.join('/tmp', 'database.sqlite');
  try {
    if (!fs.existsSync(tmpPath)) {
      const candidates = [
        dbPath,
        path.resolve(process.cwd(), 'server', 'database.sqlite'),
        path.resolve(process.cwd(), 'database.sqlite'),
        path.join(__dirname, '..', 'server', 'database.sqlite')
      ];
      const source = candidates.find(c => fs.existsSync(c));
      if (source) {
        fs.copyFileSync(source, tmpPath);
      }
    }
    dbPath = tmpPath;
  } catch (err) {
    console.error('Error handling Vercel /tmp db copy:', err);
    dbPath = path.join('/tmp', 'database.sqlite');
  }
}

// Set DEBUG_SQL=1 to log every query
const db = new Database(dbPath, process.env.DEBUG_SQL ? { verbose: console.log } : {});

// Enable foreign keys and WAL mode for fast concurrency
db.pragma('foreign_keys = ON');
try { db.pragma('journal_mode = WAL'); } catch {}

// Automatically initialize schema only if products table does not exist
const hasProducts = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'products'").get();
if (!hasProducts) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }
}

// Columns added after the first release
const MIGRATIONS = [
  ['users', 'role', "TEXT DEFAULT 'customer'"],
  ['products', 'is_active', 'INTEGER DEFAULT 1'],
  ['orders', 'payment_status', "TEXT DEFAULT 'Pending'"],
  ['orders', 'payment_ref', 'TEXT'],
  ['orders', 'coupon_code', 'TEXT'],
  ['orders', 'delivery_fee', 'REAL DEFAULT 0'],
  ['orders', 'updated_at', 'DATETIME'],
  ['coupons', 'is_active', 'INTEGER DEFAULT 1'],
  ['products', 'specs', 'TEXT'],
  ['orders', 'courier', 'TEXT'],
  ['orders', 'tracking_number', 'TEXT'],
];
for (const [table, column, definition] of MIGRATIONS) {
  try {
    const exists = db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(table);
    if (!exists) continue;
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {}
}

// Precomputed bcrypt hashes for instant initialization (cost 8)
const DEMO_HASH = '$2b$08$RuS2/hMZPh6Rww0MG0a.yeuDXvQrALjx6ocIwNUBaSR4HYDlteOdK';
const ADMIN_HASH = '$2b$08$WbY06qofXpBVmZwiiwp0D.6juuRGMDxmehAJnbk3lOrI/ze6UGWai';

try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
  if (userCount === 0) {
    db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Demo User', 'demo@electrohub.com', DEMO_HASH, 'customer');
    db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Store Admin', 'admin@electrohub.com', ADMIN_HASH, 'admin');
  }

  const demoUser = db.prepare("SELECT id FROM users WHERE email = 'demo@electrohub.com'").get();
  if (demoUser) {
    const addrCount = db.prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?').get(demoUser.id)?.count || 0;
    if (addrCount === 0) {
      db.prepare(`
        INSERT INTO addresses (user_id, name, phone, pincode, address_line, city, state, type, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(demoUser.id, 'Demo User', '9876543210', '400001', 'Flat 402, Sunshine Towers, Marine Drive', 'Mumbai', 'Maharashtra', 'Home');
    }

    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get()?.count || 0;
    if (orderCount === 0) {
      const insertOrder = db.prepare(`
        INSERT OR IGNORE INTO orders (id, user_id, total_amount, discount_amount, payment_method, status, payment_status, payment_ref, coupon_code, delivery_fee, courier, tracking_number, address_snapshot, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
      `);
      const insertItem = db.prepare(`
        INSERT OR IGNORE INTO order_items (order_id, product_id, name, price, size, quantity, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const demoAddr = JSON.stringify({
        id: 1,
        name: 'Demo User',
        phone: '9876543210',
        pincode: '400001',
        address_line: 'Flat 402, Sunshine Towers, Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        type: 'Home'
      });

      try {
        insertOrder.run(1001, demoUser.id, 52599, 0, 'UPI', 'Pending', 'Verifying', 'UPI983421098432', null, 0, null, null, demoAddr, '-1 hour', '-1 hour');
        insertItem.run(1001, 1, 'Samsung Galaxy S23 FE (Black, 8 GB RAM, 128 GB)', 52599, 'Default', 1, 'https://images.unsplash.com/photo-1592890288564-76628a30a657?w=800&q=80&auto=format&fit=crop');

        insertOrder.run(1002, demoUser.id, 108599, 1000, 'COD', 'Confirmed', 'Pay on Delivery', null, 'FLAT1000', 0, null, null, demoAddr, '-5 hours', '-4 hours');
        insertItem.run(1002, 3, 'Google Pixel 8 (Grey, 8 GB RAM, 128 GB)', 108599, 'Default', 1, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80&auto=format&fit=crop');

        insertOrder.run(1003, demoUser.id, 242699, 0, 'Card', 'Packed', 'Paid', 'pay_Nsd98234j2k34', null, 0, 'Blue Dart', null, demoAddr, '-1 day', '-18 hours');
        insertItem.run(1003, 4, 'Apple iPhone 15 Pro Max (Black, 256 GB)', 242699, 'Default', 1, 'https://images.unsplash.com/photo-1634403665481-74948d815f03?w=800&q=80&auto=format&fit=crop');

        insertOrder.run(1004, demoUser.id, 171799, 5000, 'Card', 'Shipped', 'Paid', 'pay_Plq9982348123', 'MEGA5000', 0, 'Delhivery', 'DLV9928340192', demoAddr, '-2 days', '-1 day');
        insertItem.run(1004, 2, 'Samsung Galaxy S24 Ultra (White, 12 GB RAM, 512 GB)', 171799, 'Default', 1, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80&auto=format&fit=crop');

        insertOrder.run(1005, demoUser.id, 253699, 0, 'Card', 'Delivered', 'Paid', 'pay_Okj2389148723', null, 0, 'Blue Dart', 'BD776251420IN', demoAddr, '-4 days', '-2 days');
        insertItem.run(1005, 5, 'Apple iPhone 15 Pro (Silver, 512 GB)', 253699, 'Default', 1, 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800&q=80&auto=format&fit=crop');
      } catch (e) {
        console.warn('Auto-seed orders warning:', e);
      }
    }
  }
} catch (err) {
  console.error('Error auto-seeding users and addresses:', err);
}

console.log('Database initialized successfully.');

module.exports = db;
