const dataStore = require('../dataStore');
const { successResponse, errorResponse } = require('../utils/response');
const { evaluateCoupon, getDeliveryFee } = require('../utils/pricing');
const { cleanText } = require('../utils/validate');
const { getSessionData, setSessionCookie, encryptData, decryptData } = require('../config/session');

const PAYMENT_METHODS = ['UPI', 'Card', 'COD'];

const validAddress = (fields) => {
  if (!fields || typeof fields !== 'object') return null;
  const name = cleanText(fields.name, 80);
  const phone = cleanText(fields.phone, 15);
  const pincode = cleanText(fields.pincode, 10);
  const address_line = cleanText(fields.address_line, 200);
  const city = cleanText(fields.city, 80);
  const state = cleanText(fields.state, 80);
  if (!name || !phone || !pincode || !address_line || !city || !state) return null;
  return {
    name,
    phone,
    pincode,
    address_line,
    city,
    state,
    type: ['Home', 'Work'].includes(fields.type) ? fields.type : 'Home'
  };
};

exports.createOrder = (req, res) => {
  const { payment_method, coupon_code, address } = req.body;
  const session = getSessionData(req);

  if (!PAYMENT_METHODS.includes(payment_method)) {
    return errorResponse(res, 400, 'Invalid payment method');
  }

  // Address validation from direct payload or session
  const validatedAddress = validAddress(address) || validAddress(session.addresses?.[0]);
  if (!validatedAddress) {
    return errorResponse(res, 400, 'Please provide a valid delivery address');
  }

  // Validate cart items directly from session or request items validated against catalog
  const rawItems = (session.cart && session.cart.length > 0) ? session.cart : (req.body.items || []);
  if (!rawItems.length) {
    return errorResponse(res, 400, 'Your bag is empty');
  }

  let totalAmount = 0;
  const orderItems = [];

  for (const raw of rawItems) {
    const product = dataStore.getProductById(raw.product_id || raw.id);
    if (!product || !product.is_active) {
      return errorResponse(res, 409, 'One or more items in your bag are no longer available');
    }
    const qty = Math.max(1, Math.min(10, parseInt(raw.quantity, 10) || 1));
    const itemPrice = Math.round(product.price - (product.price * (product.discount_percent || 0) / 100));
    totalAmount += itemPrice * qty;

    const images = Array.isArray(product.images) ? product.images : JSON.parse(product.images || '[]');
    orderItems.push({
      product_id: product.id,
      name: product.name,
      price: itemPrice,
      size: raw.size || null,
      quantity: qty,
      image: images[0] || null
    });
  }

  let discountAmount = 0;
  let appliedCode = null;
  if (coupon_code) {
    const couponResult = evaluateCoupon(coupon_code, totalAmount);
    if (couponResult.error) return errorResponse(res, couponResult.status, couponResult.error);
    discountAmount = couponResult.discount;
    appliedCode = couponResult.coupon.code;
  }

  const afterDiscount = totalAmount - discountAmount;
  const deliveryFee = getDeliveryFee(afterDiscount);
  const finalAmount = Math.round(afterDiscount + deliveryFee);

  // Generate simulated order
  const orderId = Math.floor(100000 + Math.random() * 900000);
  const paymentStatus = payment_method === 'COD' ? 'Pay on Delivery' : 'Paid';
  const orderStatus = 'Confirmed';
  const createdAt = new Date().toISOString();

  const orderRecord = {
    id: orderId,
    orderId,
    amount: finalAmount,
    total_amount: finalAmount,
    discount_amount: discountAmount,
    payment_method,
    paymentMethod: payment_method,
    payment_status: paymentStatus,
    paymentStatus,
    status: orderStatus,
    coupon_code: appliedCode,
    delivery_fee: deliveryFee,
    address_snapshot: validatedAddress,
    items: orderItems,
    created_at: createdAt,
    is_demo: true,
    history: [
      { status: 'Placed', note: `Simulated order placed (${payment_method}; no payment collected)`, created_at: createdAt },
      { status: 'Confirmed', note: 'Demo order confirmed instantly', created_at: createdAt }
    ]
  };

  // Encrypt demo order token (AES-256-GCM + 24h expiry). Bearer credential in URLs:
  // Note: An encrypted token in a URL is still a bearer credential that grants access to anyone who receives it.
  // We minimize details to only operational courier delivery tracking (status, courier, tracking number, city, pincode)
  // and omit personal names, street addresses, items, and billing totals.
  const demoOrderToken = encryptData({
    id: orderId,
    status: orderStatus,
    city: validatedAddress.city,
    pincode: validatedAddress.pincode,
    courier: 'BlueDart Express (Demo)',
    tracking_number: `BD-DEMO-${orderId}`,
    is_demo: true,
    created_at: createdAt,
    history: [
      { status: 'Placed', note: `Simulated order placed (${payment_method})`, created_at: createdAt },
      { status: 'Confirmed', note: 'Demo order confirmed', created_at: createdAt }
    ]
  });

  // Update session: clear cart, store placed order and address
  session.cart = [];
  session.addresses = [validatedAddress];
  session.demoOrders = [orderRecord, ...(session.demoOrders || []).filter(o => o.id !== orderId)].slice(0, 3);
  setSessionCookie(res, session);

  const response = {
    orderId,
    amount: finalAmount,
    paymentMethod: payment_method,
    paymentStatus,
    status: orderStatus,
    demoOrderToken,
    disclaimer: 'Simulated Demo Order: No payment collected, no items will be shipped, and data is not stored in a persistent database.'
  };

  return successResponse(res, 201, response, 'Demo order placed successfully');
};

exports.getMyOrders = (req, res) => {
  const session = getSessionData(req);
  return successResponse(res, 200, session.demoOrders || []);
};

exports.getOrderById = (req, res) => {
  const session = getSessionData(req);
  const order = (session.demoOrders || []).find(o => String(o.id) === String(req.params.id));
  if (!order) return errorResponse(res, 404, 'Demo order not found in current session');
  return successResponse(res, 200, order);
};

exports.cancelOrder = (req, res) => {
  const session = getSessionData(req);
  const order = (session.demoOrders || []).find(o => String(o.id) === String(req.params.id));
  if (!order) return errorResponse(res, 404, 'Demo order not found');

  order.status = 'Cancelled';
  order.history.push({
    status: 'Cancelled',
    note: 'Demo order was cancelled by customer',
    created_at: new Date().toISOString()
  });

  setSessionCookie(res, session);
  return successResponse(res, 200, order, 'Demo order cancelled');
};

exports.trackOrder = (req, res) => {
  const { orderId, token } = req.query;

  // If an encrypted token is provided, verify and decrypt it statelessly
  if (token) {
    const verified = decryptData(token);
    if (verified) return successResponse(res, 200, verified);
    return errorResponse(res, 404, 'Invalid or expired demo tracking link');
  }

  // Otherwise check current session's orders
  const session = getSessionData(req);
  const order = (session.demoOrders || []).find(o => String(o.id) === String(orderId));
  if (order) return successResponse(res, 200, order);

  return errorResponse(res, 404, 'Demo order not found in this browser session. Use the 24-hour tracking link from your confirmation.');
};
