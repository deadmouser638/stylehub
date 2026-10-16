const dataStore = require('../dataStore');
const { successResponse, errorResponse } = require('../utils/response');
const { getSessionData, setSessionCookie } = require('../config/session');

const validateAndHydrateCart = (rawCart) => {
  const items = [];
  for (const item of (rawCart || [])) {
    const product = dataStore.getProductById(item.product_id || item.id);
    if (!product || !product.is_active) continue;
    const qty = Math.max(1, Math.min(10, parseInt(item.quantity, 10) || 1));
    items.push({
      id: `${product.id}_${item.size || 'default'}`,
      product_id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      discount_percent: product.discount_percent,
      images: Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]'),
      stock: product.stock,
      size: item.size || null,
      quantity: qty
    });
  }
  return items;
};

exports.getCart = (req, res) => {
  try {
    const session = getSessionData(req);
    const validItems = validateAndHydrateCart(session.cart);
    return successResponse(res, 200, validItems);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.addToCart = (req, res) => {
  const { productId, size } = req.body;
  const quantity = Number(req.body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return errorResponse(res, 400, 'Quantity must be a positive whole number');
  }

  try {
    const product = dataStore.getProductById(productId);
    if (!product || !product.is_active) {
      return errorResponse(res, 404, 'Product not found or no longer available');
    }
    if (product.stock < quantity) {
      return errorResponse(res, 400, 'Not enough stock available');
    }

    const session = getSessionData(req);
    const currentCart = session.cart || [];
    const existingIndex = currentCart.findIndex(i => Number(i.product_id) === Number(productId) && (i.size || null) === (size || null));

    if (existingIndex !== -1) {
      currentCart[existingIndex].quantity = Math.min(10, currentCart[existingIndex].quantity + quantity);
    } else {
      currentCart.push({
        product_id: Number(productId),
        size: size || null,
        quantity
      });
    }

    session.cart = currentCart;
    setSessionCookie(res, session);

    const hydrated = validateAndHydrateCart(session.cart);
    return successResponse(res, 200, hydrated, 'Added to bag');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateQuantity = (req, res) => {
  const quantity = Number(req.body.quantity);
  const { itemId } = req.params;
  if (!Number.isInteger(quantity) || quantity < 1) {
    return errorResponse(res, 400, 'Quantity must be a positive whole number');
  }

  try {
    const session = getSessionData(req);
    const currentCart = session.cart || [];
    const item = currentCart.find(i => `${i.product_id}_${i.size || 'default'}` === itemId || String(i.product_id) === String(itemId));

    if (!item) return errorResponse(res, 404, 'Cart item not found');

    const product = dataStore.getProductById(item.product_id);
    if (!product || product.stock < quantity) {
      return errorResponse(res, 400, 'Requested quantity exceeds available stock');
    }

    item.quantity = Math.min(10, quantity);
    session.cart = currentCart;
    setSessionCookie(res, session);

    const hydrated = validateAndHydrateCart(session.cart);
    return successResponse(res, 200, hydrated, 'Quantity updated');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.removeFromCart = (req, res) => {
  try {
    const { itemId } = req.params;
    const session = getSessionData(req);
    session.cart = (session.cart || []).filter(i => `${i.product_id}_${i.size || 'default'}` !== itemId && String(i.product_id) !== String(itemId));
    setSessionCookie(res, session);

    const hydrated = validateAndHydrateCart(session.cart);
    return successResponse(res, 200, hydrated, 'Item removed');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.clearCart = (req, res) => {
  try {
    const session = getSessionData(req);
    session.cart = [];
    setSessionCookie(res, session);
    return successResponse(res, 200, [], 'Cart cleared');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
