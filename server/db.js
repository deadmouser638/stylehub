const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let dbPath = path.resolve(__dirname, 'database.sqlite');

if (isVercel) {
  const tmpPath = path.join('/tmp', 'database.sqlite');
  try {
    if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, tmpPath);
    }
    if (fs.existsSync(tmpPath)) {
      dbPath = tmpPath;
    }
  } catch (err) {
    console.error('Error handling Vercel /tmp db copy:', err);
  }
}

// Set DEBUG_SQL=1 to log every query
const db = new Database(dbPath, process.env.DEBUG_SQL ? { verbose: console.log } : {});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Columns added after the first release. CREATE TABLE IF NOT EXISTS doesn't change
// existing tables, so older databases get them here before the schema runs.
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
  const exists = db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(table);
  if (!exists) continue;
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Automatically initialize schema
const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Ensure demo and admin users exist if table is empty
try {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const demoHash = bcrypt.hashSync('Demo@123', 8);
    const adminHash = bcrypt.hashSync('Admin@123', 8);
    db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Demo User', 'demo@electrohub.com', demoHash, 'customer');
    db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Store Admin', 'admin@electrohub.com', adminHash, 'admin');
  }
} catch (err) {
  console.error('Error auto-seeding users:', err);
}

console.log('Database initialized successfully.');

module.exports = db;
