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
  }
} catch (err) {
  console.error('Error auto-seeding users and addresses:', err);
}

console.log('Database initialized successfully.');

module.exports = db;
