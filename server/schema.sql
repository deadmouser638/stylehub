CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  gender TEXT,
  role TEXT DEFAULT 'customer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  gender TEXT NOT NULL,
  price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  colors TEXT, -- JSON array
  sizes TEXT, -- JSON array
  images TEXT, -- JSON array
  specs TEXT, -- JSON object, e.g. {"RAM":"8 GB"}
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  size TEXT,
  quantity INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pincode TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  type TEXT DEFAULT 'Home',
  is_default BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  payment_status TEXT DEFAULT 'Pending',
  payment_ref TEXT,
  coupon_code TEXT,
  delivery_fee REAL DEFAULT 0,
  courier TEXT,
  tracking_number TEXT,
  address_snapshot TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  size TEXT,
  quantity INTEGER NOT NULL,
  image TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category, subcategory);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items (user_id);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- 'PERCENTAGE' or 'FLAT'
  discount_value REAL NOT NULL,
  min_order REAL DEFAULT 0,
  expires_at DATETIME,
  is_active INTEGER DEFAULT 1
);

-- Promotional banners shown on the home page (hero) and in the header ticker
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  link TEXT,
  image TEXT,
  placement TEXT DEFAULT 'hero', -- 'hero' or 'ticker'
  position INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  starts_at DATETIME,
  ends_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Every status change of an order, shown as the tracking timeline
CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Stock ledger: every change to a product's stock and why
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  change INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_history_order ON order_status_history (order_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements (product_id);
