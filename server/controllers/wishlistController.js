const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');

exports.getWishlist = (req, res) => {
  try {
    const wishlist = db.prepare(`
      SELECT w.id, w.product_id, 
             p.name, p.brand, p.price, p.discount_percent, p.images, p.sizes, p.stock
      FROM wishlist_items w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
    `).all(req.user.id);

    wishlist.forEach(item => {
      item.images = JSON.parse(item.images || '[]');
      item.sizes = JSON.parse(item.sizes || '[]');
    });

    return successResponse(res, 200, wishlist);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.addToWishlist = (req, res) => {
  try {
    const { productId } = req.params;
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const existing = db.prepare('SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
    
    if (existing) {
      return errorResponse(res, 400, 'Product already in wishlist');
    }

    db.prepare('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)').run(req.user.id, productId);
    return successResponse(res, 200, null, 'Added to wishlist');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.removeFromWishlist = (req, res) => {
  try {
    db.prepare('DELETE FROM wishlist_items WHERE product_id = ? AND user_id = ?').run(req.params.productId, req.user.id);
    return successResponse(res, 200, null, 'Removed from wishlist');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.moveToCart = (req, res) => {
  const { productId } = req.params;
  try {
    const product = db.prepare('SELECT stock, sizes FROM products WHERE id = ?').get(productId);
    if (!product || product.stock < 1) return errorResponse(res, 400, 'Product out of stock');

    const sizes = JSON.parse(product.sizes || '[]');
    const size = req.body.size || sizes[0] || null;
    if (sizes.length > 0 && !sizes.includes(size)) return errorResponse(res, 400, 'Invalid size for this product');

    const existingCart = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND size IS ?').get(req.user.id, productId, size);

    if (existingCart) {
      if (product.stock < existingCart.quantity + 1) return errorResponse(res, 400, 'Not enough stock for total quantity');
      db.prepare('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?').run(existingCart.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, size, quantity) VALUES (?, ?, ?, ?)').run(req.user.id, productId, size, 1);
    }

    db.prepare('DELETE FROM wishlist_items WHERE product_id = ? AND user_id = ?').run(productId, req.user.id);
    return successResponse(res, 200, null, 'Moved to cart');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
