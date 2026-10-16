const dataStore = require('../dataStore');
const { successResponse, errorResponse } = require('../utils/response');
const { getSessionData, setSessionCookie } = require('../config/session');

exports.getWishlist = (req, res) => {
  try {
    const session = getSessionData(req);
    const wishlistIds = session.wishlist || [];
    const items = wishlistIds.map(id => dataStore.getProductById(id)).filter(Boolean).map(p => ({
      id: p.id,
      product_id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      discount_percent: p.discount_percent,
      images: Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'),
      sizes: Array.isArray(p.sizes) ? p.sizes : JSON.parse(p.sizes || '[]'),
      stock: p.stock
    }));
    return successResponse(res, 200, items);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.addToWishlist = (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const product = dataStore.getProductById(productId);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const session = getSessionData(req);
    session.wishlist = session.wishlist || [];
    if (!session.wishlist.includes(productId)) {
      session.wishlist.push(productId);
    }
    setSessionCookie(res, session);
    return successResponse(res, 200, null, 'Added to wishlist');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.removeFromWishlist = (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const session = getSessionData(req);
    session.wishlist = (session.wishlist || []).filter(id => id !== productId);
    setSessionCookie(res, session);
    return successResponse(res, 200, null, 'Removed from wishlist');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.moveToCart = (req, res) => {
  const productId = Number(req.params.productId);
  try {
    const product = dataStore.getProductById(productId);
    if (!product || product.stock < 1) return errorResponse(res, 400, 'Product out of stock');

    const session = getSessionData(req);
    session.wishlist = (session.wishlist || []).filter(id => id !== productId);
    session.cart = session.cart || [];
    const existing = session.cart.find(i => Number(i.product_id) === productId);
    if (existing) {
      existing.quantity = Math.min(10, existing.quantity + 1);
    } else {
      session.cart.push({ product_id: productId, size: req.body.size || null, quantity: 1 });
    }
    setSessionCookie(res, session);
    return successResponse(res, 200, null, 'Moved to bag');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
