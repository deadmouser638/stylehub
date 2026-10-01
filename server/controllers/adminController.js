const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');
const { cancelAndRestock } = require('./orderController');
const { adjustStock, addHistory } = require('../utils/inventory');

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Verifying', 'Paid', 'Pay on Delivery', 'Failed', 'Refund Initiated', 'Refunded', 'Cancelled', 'Not Required'];

const parseProduct = (p) => ({ ...p, colors: JSON.parse(p.colors || '[]'), sizes: JSON.parse(p.sizes || '[]'), images: JSON.parse(p.images || '[]'), specs: JSON.parse(p.specs || '{}') });

// Specs arrive as an object or as "Key: Value" lines
const parseSpecs = (value) => {
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [String(k).trim(), String(v).trim()]).filter(([k, v]) => k && v));
  const specs = {};
  String(value || '').split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i > 0) { const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim(); if (k && v) specs[k] = v; }
  });
  return specs;
};
const list = (value) => (Array.isArray(value) ? value : String(value || '').split(/[,\n]/)).map(v => String(v).trim()).filter(Boolean);
const num = (value, fallback = 0) => (value === '' || value === undefined || value === null || Number.isNaN(Number(value)) ? fallback : Number(value));

// ---------- Dashboard ----------
exports.getStats = (req, res) => {
  try {
    const one = (sql, ...p) => db.prepare(sql).get(...p);
    return successResponse(res, 200, {
      products: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 1').n,
      archived: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 0').n,
      lowStock: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND stock <= 5').n,
      orders: one('SELECT COUNT(*) AS n FROM orders').n,
      pendingOrders: one("SELECT COUNT(*) AS n FROM orders WHERE status IN ('Pending', 'Confirmed', 'Packed', 'Shipped')").n,
      paymentsToVerify: one("SELECT COUNT(*) AS n FROM orders WHERE payment_status = 'Verifying'").n,
      revenue: one("SELECT COALESCE(SUM(total_amount), 0) AS n FROM orders WHERE status != 'Cancelled'").n,
      customers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").n,
      byCategory: db.prepare('SELECT category, COUNT(*) AS count, SUM(stock) AS stock FROM products WHERE is_active = 1 GROUP BY category ORDER BY category').all(),
      recentOrders: db.prepare('SELECT o.*, u.name AS customer FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 6').all(),
      lowStockProducts: db.prepare('SELECT id, name, brand, stock, images FROM products WHERE is_active = 1 AND stock <= 5 ORDER BY stock ASC LIMIT 8').all().map(parseProduct),
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

// ---------- Products ----------
exports.getProductCategories = (req, res) => {
  const rows = db.prepare('SELECT category, subcategory, COUNT(*) AS count FROM products GROUP BY category, subcategory ORDER BY category, subcategory').all();
  const tree = {};
  rows.forEach(r => { (tree[r.category] ||= { name: r.category, count: 0, subcategories: [] }).subcategories.push({ name: r.subcategory, count: r.count }); tree[r.category].count += r.count; });
  return successResponse(res, 200, Object.values(tree));
};

exports.listProducts = (req, res) => {
  try {
    const { search, category, subcategory, status = 'active', sort = 'newest' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = ['1=1'];
    const params = [];
    if (status === 'active') where.push('is_active = 1');
    if (status === 'archived') where.push('is_active = 0');
    if (status === 'out') where.push('is_active = 1 AND stock = 0');
    if (status === 'low') where.push('is_active = 1 AND stock <= 5');
    if (category) { where.push('category = ?'); params.push(category); }
    if (subcategory) { where.push('subcategory = ?'); params.push(subcategory); }
    if (search) {
      where.push('(name LIKE ? OR brand LIKE ? OR CAST(id AS TEXT) = ?)');
      params.push(`%${search}%`, `%${search}%`, String(search).trim());
    }
    const order = { newest: 'id DESC', oldest: 'id ASC', price_asc: 'price ASC', price_desc: 'price DESC', stock_asc: 'stock ASC', name: 'name ASC' }[sort] || 'id DESC';
    const total = db.prepare(`SELECT COUNT(*) AS n FROM products WHERE ${where.join(' AND ')}`).get(...params).n;
    const products = db.prepare(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit).map(parseProduct);
    return successResponse(res, 200, { products, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

const productFields = (body) => {
  const data = {
    name: String(body.name || '').trim(),
    brand: String(body.brand || '').trim(),
    description: String(body.description || '').trim(),
    category: String(body.category || '').trim(),
    subcategory: String(body.subcategory || '').trim(),
    gender: String(body.gender || 'Unisex').trim(),
    price: num(body.price, NaN),
    discount_percent: num(body.discount_percent),
    stock: Math.round(num(body.stock)),
    rating: num(body.rating, 0),
    rating_count: Math.round(num(body.rating_count, 0)),
    colors: JSON.stringify(list(body.colors)),
    sizes: JSON.stringify(list(body.sizes)),
    images: JSON.stringify(list(body.images)),
    specs: JSON.stringify(parseSpecs(body.specs)),
    is_active: body.is_active === false || body.is_active === 0 || body.is_active === '0' ? 0 : 1,
  };
  const errors = [];
  if (!data.name) errors.push('name');
  if (!data.brand) errors.push('brand');
  if (!data.category) errors.push('category');
  if (!data.subcategory) errors.push('subcategory');
  if (!(data.price > 0)) errors.push('price (must be more than 0)');
  if (data.discount_percent < 0 || data.discount_percent > 95) errors.push('discount (0-95%)');
  if (data.stock < 0) errors.push('stock (cannot be negative)');
  if (!list(body.images).length) errors.push('at least one image URL');
  return { data, errors };
};

exports.getProduct = (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return errorResponse(res, 404, 'Product not found');
  return successResponse(res, 200, parseProduct(product));
};

exports.createProduct = (req, res) => {
  try {
    const { data, errors } = productFields(req.body);
    if (errors.length) return errorResponse(res, 400, `Please check: ${errors.join(', ')}`);
    const info = db.prepare(`
      INSERT INTO products (name, brand, description, category, subcategory, gender, price, discount_percent, stock, rating, rating_count, colors, sizes, images, specs, is_active)
      VALUES (@name, @brand, @description, @category, @subcategory, @gender, @price, @discount_percent, 0, @rating, @rating_count, @colors, @sizes, @images, @specs, @is_active)
    `).run(data);
    if (data.stock > 0) adjustStock(info.lastInsertRowid, data.stock, 'Initial stock', 'Product created');
    return successResponse(res, 201, parseProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid)), 'Product created');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateProduct = (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return errorResponse(res, 404, 'Product not found');
    // Keep fields the form didn't send (e.g. rating) unchanged
    const merged = { ...parseProduct(existing), ...req.body };
    const { data, errors } = productFields(merged);
    if (errors.length) return errorResponse(res, 400, `Please check: ${errors.join(', ')}`);
    db.prepare(`
      UPDATE products SET name = @name, brand = @brand, description = @description, category = @category, subcategory = @subcategory,
        gender = @gender, price = @price, discount_percent = @discount_percent, stock = @stock, rating = @rating, rating_count = @rating_count,
        colors = @colors, sizes = @sizes, images = @images, specs = @specs, is_active = @is_active
      WHERE id = @id
    `).run({ ...data, stock: data.stock, id: existing.id });
    if (data.stock !== existing.stock) {
      try {
        db.prepare('INSERT INTO inventory_movements (product_id, change, stock_after, reason, reference) VALUES (?, ?, ?, ?, ?)')
          .run(existing.id, data.stock - existing.stock, data.stock, 'Manual edit', 'Product form');
      } catch {}
    }
    return successResponse(res, 200, parseProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id)), 'Product updated');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

// Products that appear in past orders are archived (hidden from the shop) so order history stays intact
exports.deleteProduct = (req, res) => {
  try {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');
    const ordered = db.prepare('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1').get(product.id);
    db.transaction(() => {
      db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(product.id);
      db.prepare('DELETE FROM wishlist_items WHERE product_id = ?').run(product.id);
      if (ordered) {
        db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(product.id);
      } else {
        db.prepare('DELETE FROM reviews WHERE product_id = ?').run(product.id);
        db.prepare('DELETE FROM products WHERE id = ?').run(product.id);
      }
    })();
    return successResponse(res, 200, { archived: Boolean(ordered) }, ordered ? 'Product has past orders, so it was archived instead of deleted' : 'Product deleted');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

// ---------- Coupons ----------
const couponFields = (body) => {
  const data = {
    code: String(body.code || '').trim().toUpperCase(),
    discount_type: body.discount_type === 'FLAT' ? 'FLAT' : 'PERCENTAGE',
    discount_value: num(body.discount_value, NaN),
    min_order: num(body.min_order),
    expires_at: body.expires_at ? String(body.expires_at).replace('T', ' ').slice(0, 19) : null,
    is_active: body.is_active === false || body.is_active === 0 || body.is_active === '0' ? 0 : 1,
  };
  const errors = [];
  if (!/^[A-Z0-9]{3,20}$/.test(data.code)) errors.push('code (3-20 letters/numbers)');
  if (!(data.discount_value > 0)) errors.push('discount value');
  if (data.discount_type === 'PERCENTAGE' && data.discount_value > 90) errors.push('percentage (max 90)');
  if (data.min_order < 0) errors.push('minimum order');
  return { data, errors };
};

exports.listCoupons = (req, res) => successResponse(res, 200, db.prepare(`
  SELECT c.*, (SELECT COUNT(*) FROM orders o WHERE o.coupon_code = c.code) AS times_used FROM coupons c ORDER BY c.id DESC
`).all());

exports.createCoupon = (req, res) => {
  const { data, errors } = couponFields(req.body);
  if (errors.length) return errorResponse(res, 400, `Please check: ${errors.join(', ')}`);
  if (db.prepare('SELECT 1 FROM coupons WHERE code = ?').get(data.code)) return errorResponse(res, 400, 'A coupon with this code already exists');
  const info = db.prepare('INSERT INTO coupons (code, discount_type, discount_value, min_order, expires_at, is_active) VALUES (@code, @discount_type, @discount_value, @min_order, @expires_at, @is_active)').run(data);
  return successResponse(res, 201, { id: info.lastInsertRowid }, 'Coupon created');
};

exports.updateCoupon = (req, res) => {
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!existing) return errorResponse(res, 404, 'Coupon not found');
  const { data, errors } = couponFields({ ...existing, ...req.body });
  if (errors.length) return errorResponse(res, 400, `Please check: ${errors.join(', ')}`);
  if (db.prepare('SELECT 1 FROM coupons WHERE code = ? AND id != ?').get(data.code, existing.id)) return errorResponse(res, 400, 'A coupon with this code already exists');
  db.prepare('UPDATE coupons SET code = @code, discount_type = @discount_type, discount_value = @discount_value, min_order = @min_order, expires_at = @expires_at, is_active = @is_active WHERE id = @id').run({ ...data, id: existing.id });
  return successResponse(res, 200, null, 'Coupon updated');
};

exports.deleteCoupon = (req, res) => {
  const info = db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  if (!info.changes) return errorResponse(res, 404, 'Coupon not found');
  return successResponse(res, 200, null, 'Coupon deleted');
};

// ---------- Offers (home page banners & header ticker) ----------
const offerFields = (body) => {
  const data = {
    title: String(body.title || '').trim(),
    subtitle: String(body.subtitle || '').trim(),
    cta_label: String(body.cta_label || '').trim(),
    link: String(body.link || '').trim(),
    image: String(body.image || '').trim(),
    placement: body.placement === 'ticker' ? 'ticker' : 'hero',
    position: Math.round(num(body.position)),
    is_active: body.is_active === false || body.is_active === 0 || body.is_active === '0' ? 0 : 1,
    starts_at: body.starts_at ? String(body.starts_at).replace('T', ' ').slice(0, 19) : null,
    ends_at: body.ends_at ? String(body.ends_at).replace('T', ' ').slice(0, 19) : null,
  };
  const errors = [];
  if (!data.title) errors.push('title');
  if (data.placement === 'hero' && !data.image) errors.push('image URL (required for home page banners)');
  if (data.link && !data.link.startsWith('/') && !/^https?:\/\//.test(data.link)) errors.push('link (must start with / or http)');
  return { data, errors };
};

exports.listOffers = (req, res) => successResponse(res, 200, db.prepare('SELECT * FROM offers ORDER BY placement, position, id').all());

exports.createOffer = (req, res) => {
  const { data, errors } = offerFields(req.body);
  if (errors.length) return errorResponse(res, 400, `Please check: ${errors.join(', ')}`);
  const info = db.prepare(`INSERT INTO offers (title, subtitle, cta_label, link, image, placement, position, is_active, starts_at, ends_at)
    VALUES (@title, @subtitle, @cta_label, @link, @image, @placement, @position, @is_active, @starts_at, @ends_at)`).run(data);
  return successResponse(res, 201, { id: info.lastInsertRowid }, 'Offer created');
};

exports.updateOffer = (req, res) => {
  const existing = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  if (!existing) return errorResponse(res, 404, 'Offer not found');
  const { data, errors } = offerFields({ ...existing, ...req.body });
  if (errors.length) return errorResponse(res, 400, `Please check: ${errors.join(', ')}`);
  db.prepare(`UPDATE offers SET title = @title, subtitle = @subtitle, cta_label = @cta_label, link = @link, image = @image, placement = @placement,
    position = @position, is_active = @is_active, starts_at = @starts_at, ends_at = @ends_at WHERE id = @id`).run({ ...data, id: existing.id });
  return successResponse(res, 200, null, 'Offer updated');
};

exports.deleteOffer = (req, res) => {
  const info = db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
  if (!info.changes) return errorResponse(res, 404, 'Offer not found');
  return successResponse(res, 200, null, 'Offer deleted');
};

// ---------- Orders ----------
exports.listOrders = (req, res) => {
  try {
    const { status, payment, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = ['1=1'];
    const params = [];
    if (status) { where.push('o.status = ?'); params.push(status); }
    if (payment) { where.push('o.payment_status = ?'); params.push(payment); }
    if (search) {
      where.push('(CAST(o.id AS TEXT) = ? OR u.name LIKE ? OR u.email LIKE ? OR o.payment_ref = ?)');
      params.push(String(search).replace('#', '').trim(), `%${search}%`, `%${search}%`, String(search).trim());
    }
    const base = `FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE ${where.join(' AND ')}`;
    const total = db.prepare(`SELECT COUNT(*) AS n ${base}`).get(...params).n;
    const orders = db.prepare(`SELECT o.*, COALESCE(u.name, 'Customer') AS customer, COALESCE(u.email, '') AS customer_email ${base} ORDER BY o.id DESC LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
    orders.forEach(o => {
      try {
        o.address_snapshot = typeof o.address_snapshot === 'string' ? JSON.parse(o.address_snapshot || '{}') : (o.address_snapshot || {});
      } catch {
        o.address_snapshot = {};
      }
      if (o.customer === 'Customer' && o.address_snapshot?.name) {
        o.customer = o.address_snapshot.name;
      }
      o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    });
    return successResponse(res, 200, { orders, pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }, statuses: ORDER_STATUSES, paymentStatuses: PAYMENT_STATUSES });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateOrder = (req, res) => {
  try {
    let order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    let { status, payment_status, courier, tracking_number, order: incomingOrder } = req.body;

    // Normalize status names
    if (status === 'Placed') status = 'Confirmed';
    if (status) {
      const match = ORDER_STATUSES.find(s => s.toLowerCase() === String(status).trim().toLowerCase());
      if (match) status = match;
    }
    if (payment_status) {
      const match = PAYMENT_STATUSES.find(p => p.toLowerCase() === String(payment_status).trim().toLowerCase());
      if (match) payment_status = match;
    }

    // Upsert order if missing from this serverless container
    if (!order) {
      const fallbackUserId = incomingOrder?.user_id || 1;
      const totalAmount = incomingOrder?.total_amount || 0;
      const discountAmount = incomingOrder?.discount_amount || 0;
      const paymentMethod = incomingOrder?.payment_method || 'COD';
      const addressJson = typeof incomingOrder?.address_snapshot === 'object'
        ? JSON.stringify(incomingOrder.address_snapshot)
        : (incomingOrder?.address_snapshot || '{}');

      try {
        db.prepare(`
          INSERT INTO orders (id, user_id, total_amount, discount_amount, payment_method, payment_status, status, courier, tracking_number, address_snapshot, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), CURRENT_TIMESTAMP)
        `).run(
          req.params.id,
          fallbackUserId,
          totalAmount,
          discountAmount,
          paymentMethod,
          payment_status || 'Paid',
          status || 'Confirmed',
          courier || null,
          tracking_number || null,
          addressJson
        );
        order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
      } catch (err) {
        console.error('Error inserting fallback order:', err);
      }
    }

    if (!order) return errorResponse(res, 404, 'Order not found');
    if (status && !ORDER_STATUSES.includes(status)) return errorResponse(res, 400, 'Invalid order status');
    if (payment_status && !PAYMENT_STATUSES.includes(payment_status)) return errorResponse(res, 400, 'Invalid payment status');

    if (courier !== undefined || tracking_number !== undefined) {
      db.prepare('UPDATE orders SET courier = ?, tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(String(courier ?? order.courier ?? '').trim() || null, String(tracking_number ?? order.tracking_number ?? '').trim() || null, order.id);
    }
    const fresh = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      try { cancelAndRestock(order, 'Cancelled by store'); } catch {}
    } else if (status && status !== order.status) {
      db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, order.id);
      const notes = { Confirmed: 'Order confirmed', Packed: 'Packed and ready to ship', Shipped: fresh.courier ? `Shipped via ${fresh.courier}${fresh.tracking_number ? ` (tracking no. ${fresh.tracking_number})` : ''}` : 'Shipped', Delivered: 'Delivered to customer', Pending: 'Moved back to pending' };
      try { addHistory(order.id, status, notes[status]); } catch {}
      // Cash is collected when a COD order is delivered
      if (status === 'Delivered' && order.payment_status === 'Pay on Delivery' && !payment_status) {
        db.prepare("UPDATE orders SET payment_status = 'Paid' WHERE id = ?").run(order.id);
      }
    }
    if (payment_status && payment_status !== order.payment_status) {
      db.prepare('UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(payment_status, order.id);
      if (payment_status === 'Paid') {
        try { addHistory(order.id, 'Payment received', order.payment_ref ? `Reference ${order.payment_ref}` : null); } catch {}
      }
    }
    return successResponse(res, 200, db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id), 'Order updated');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.deleteOrder = (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return errorResponse(res, 404, 'Order not found');
    db.transaction(() => {
      if (!['Cancelled', 'Delivered'].includes(order.status)) cancelAndRestock(order, 'Order deleted by store'); // put stock back first
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);
    })();
    return successResponse(res, 200, null, 'Order deleted');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

// ---------- Inventory ----------
exports.getInventorySummary = (req, res) => {
  const one = (sql) => db.prepare(sql).get();
  return successResponse(res, 200, {
    units: one('SELECT COALESCE(SUM(stock), 0) AS n FROM products WHERE is_active = 1').n,
    value: one('SELECT COALESCE(SUM(stock * price * (100 - discount_percent) / 100), 0) AS n FROM products WHERE is_active = 1').n,
    lowStock: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND stock BETWEEN 1 AND 5').n,
    outOfStock: one('SELECT COUNT(*) AS n FROM products WHERE is_active = 1 AND stock = 0').n,
    byCategory: db.prepare('SELECT category, SUM(stock) AS units, COUNT(*) AS products, SUM(stock = 0) AS out FROM products WHERE is_active = 1 GROUP BY category ORDER BY category').all(),
  });
};

exports.adjustInventory = (req, res) => {
  try {
    const change = Math.round(Number(req.body.change));
    const reason = String(req.body.reason || '').trim() || (change > 0 ? 'Restock' : 'Stock correction');
    if (!Number.isInteger(change) || change === 0) return errorResponse(res, 400, 'Enter how many units to add (positive) or remove (negative)');
    const product = db.prepare('SELECT id, stock FROM products WHERE id = ?').get(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');
    if (product.stock + change < 0) return errorResponse(res, 400, `Only ${product.stock} units in stock`);
    const stock = db.transaction(() => adjustStock(product.id, change, reason, `By ${req.user.name}`))();
    return successResponse(res, 200, { stock }, 'Stock updated');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.setInventoryStock = (req, res) => {
  try {
    const targetStock = Math.max(0, Math.round(Number(req.body.stock ?? 0)));
    const product = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');
    const change = targetStock - product.stock;
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(targetStock, product.id);
    if (change !== 0) {
      try {
        db.prepare('INSERT INTO inventory_movements (product_id, change, stock_after, reason, reference) VALUES (?, ?, ?, ?, ?)')
          .run(product.id, change, targetStock, change > 0 ? 'Restock' : 'Stock correction', `By ${req.user.name || 'Admin'}`);
      } catch {}
    }
    return successResponse(res, 200, { stock: targetStock }, `${product.name} stock set to ${targetStock}`);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.listMovements = (req, res) => {
  const params = [];
  let where = '1=1';
  if (req.query.productId) { where = 'm.product_id = ?'; params.push(req.query.productId); }
  const rows = db.prepare(`
    SELECT m.*, p.name, p.images FROM inventory_movements m JOIN products p ON p.id = m.product_id
    WHERE ${where} ORDER BY m.id DESC LIMIT 60
  `).all(...params).map(r => ({ ...r, image: JSON.parse(r.images || '[]')[0] || null, images: undefined }));
  return successResponse(res, 200, rows);
};
