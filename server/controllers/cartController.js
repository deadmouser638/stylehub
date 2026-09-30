const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');

exports.getCart = (req, res) => {
  try {
    const cart = db.prepare(`
      SELECT c.id, c.product_id, c.size, c.quantity, 
             p.name, p.brand, p.price, p.discount_percent, p.images, p.stock
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `).all(req.user.id);

    cart.forEach(item => {
      item.images = JSON.parse(item.images || '[]');
    });

    return successResponse(res, 200, cart);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.addToCart = (req, res) => {
  const { productId } = req.body;
  const size = req.body.size || null;
  const quantity = Number(req.body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1) return errorResponse(res, 400, 'Quantity must be a positive whole number');

  try {
    const product = db.prepare('SELECT stock FROM products WHERE id = ? AND is_active = 1').get(productId);
    if (!product) return errorResponse(res, 404, 'Product not found or no longer available');
    if (product.stock < quantity) return errorResponse(res, 400, 'Not enough stock');

    const existingItem = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND size IS ?').get(req.user.id, productId, size);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) return errorResponse(res, 400, 'Not enough stock for total quantity');
      
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQuantity, existingItem.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, size, quantity) VALUES (?, ?, ?, ?)').run(req.user.id, productId, size, quantity);
    }
    
    return successResponse(res, 200, null, 'Added to cart');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateQuantity = (req, res) => {
  const quantity = Number(req.body.quantity);
  const { itemId } = req.params;
  if (!Number.isInteger(quantity) || quantity < 1) return errorResponse(res, 400, 'Quantity must be a positive whole number');

  try {
    const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(itemId, req.user.id);
    if (!item) return errorResponse(res, 404, 'Cart item not found');

    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    if (product.stock < quantity) return errorResponse(res, 400, 'Not enough stock');

    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, itemId);
    return successResponse(res, 200, null, 'Quantity updated');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.removeFromCart = (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.itemId, req.user.id);
    return successResponse(res, 200, null, 'Item removed');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.clearCart = (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    return successResponse(res, 200, null, 'Cart cleared');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
