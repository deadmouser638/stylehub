const db = require('../db');

// Changes a product's stock and records the movement in the stock ledger.
// Call inside a transaction when it is part of a bigger change (e.g. placing an order).
exports.adjustStock = (productId, change, reason, reference = null) => {
  db.prepare('UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?').run(change, productId);
  const { stock } = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId) || { stock: 0 };
  db.prepare('INSERT INTO inventory_movements (product_id, change, stock_after, reason, reference) VALUES (?, ?, ?, ?, ?)')
    .run(productId, change, stock, reason, reference);
  return stock;
};

// Adds an entry to an order's tracking timeline
exports.addHistory = (orderId, status, note = null) => {
  db.prepare('INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)').run(orderId, status, note);
};

exports.getHistory = (orderId) =>
  db.prepare('SELECT status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY id').all(orderId);
