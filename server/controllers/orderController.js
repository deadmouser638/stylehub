const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');
const { evaluateCoupon, getDeliveryFee } = require('../utils/pricing');
const { buildUpiPayment } = require('../utils/upi');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config/payment');
const { adjustStock, addHistory, getHistory } = require('../utils/inventory');

const PAYMENT_METHODS = ['UPI', 'Card', 'COD'];
// Orders the customer may still cancel
const CANCELLABLE = ['Pending', 'Confirmed'];

const withDetails = (order) => {
  order.address_snapshot = JSON.parse(order.address_snapshot || '{}');
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  order.history = getHistory(order.id);
  return order;
};

exports.createOrder = async (req, res) => {
  const { payment_method, address_id, coupon_code } = req.body;
  const user_id = req.user.id;

  if (!PAYMENT_METHODS.includes(payment_method)) {
    return errorResponse(res, 400, 'Invalid payment method');
  }
  if (payment_method === 'Card' && !(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)) {
    return errorResponse(res, 400, 'Card payments are not available right now. Please choose UPI or Cash on Delivery.');
  }

  try {
    const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(address_id, user_id);
    if (!address) return errorResponse(res, 404, 'Address not found');

    const cartItems = db.prepare(`
      SELECT c.*, p.name, p.price, p.discount_percent, p.stock, p.images, p.is_active
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `).all(user_id);

    if (cartItems.length === 0) return errorResponse(res, 400, 'Cart is empty');

    let totalAmount = 0;
    for (const item of cartItems) {
      if (!item.is_active) return errorResponse(res, 400, `${item.name} is no longer available. Please remove it from your bag.`);
      if (item.stock < item.quantity) {
        return errorResponse(res, 400, `Insufficient stock for product ${item.name}`);
      }
      const itemPrice = item.price - (item.price * item.discount_percent / 100);
      totalAmount += itemPrice * item.quantity;
    }

    let discountAmount = 0;
    let appliedCode = null;
    if (coupon_code) {
      const result = evaluateCoupon(coupon_code, totalAmount);
      if (result.error) return errorResponse(res, result.status, result.error);
      discountAmount = result.discount;
      appliedCode = result.coupon.code;
    }

    const afterDiscount = totalAmount - discountAmount;
    const deliveryFee = getDeliveryFee(afterDiscount);
    const finalAmount = Math.round(afterDiscount + deliveryFee);
    const addressSnapshot = JSON.stringify(address);
    // COD is collected on delivery; UPI and card start as pending until the payment is confirmed
    const paymentStatus = payment_method === 'COD' ? 'Pay on Delivery' : 'Pending';

    const orderId = db.transaction(() => {
      const orderInfo = db.prepare(`
        INSERT INTO orders (user_id, total_amount, discount_amount, payment_method, payment_status, coupon_code, delivery_fee, address_snapshot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(user_id, finalAmount, discountAmount, payment_method, paymentStatus, appliedCode, deliveryFee, addressSnapshot);

      const id = orderInfo.lastInsertRowid;
      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, name, price, size, quantity, image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of cartItems) {
        const itemPrice = item.price - (item.price * item.discount_percent / 100);
        const images = JSON.parse(item.images || '[]');
        insertOrderItem.run(id, item.product_id, item.name, itemPrice, item.size, item.quantity, images[0] || null);
        adjustStock(item.product_id, -item.quantity, 'Sold', `Order #${id}`);
      }

      addHistory(id, 'Placed', payment_method === 'COD' ? 'Order placed (cash on delivery)' : 'Order placed, waiting for payment');
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(user_id);
      return id;
    })();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const response = { orderId, amount: finalAmount, paymentMethod: payment_method, paymentStatus };
    if (payment_method === 'UPI') response.upi = await buildUpiPayment(order);

    return successResponse(res, 201, response, 'Order created successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getMyOrders = (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user.id);
    return successResponse(res, 200, orders.map(withDetails));
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getOrderById = (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return errorResponse(res, 404, 'Order not found');
    return successResponse(res, 200, withDetails(order));
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

// Shared with the admin panel: cancels an order and puts its items back in stock
const cancelAndRestock = (order, note = 'Order cancelled') => {
  db.transaction(() => {
    const refund = order.payment_status === 'Paid' ? 'Refund Initiated' : order.payment_status === 'Pay on Delivery' ? 'Not Required' : 'Cancelled';
    db.prepare("UPDATE orders SET status = 'Cancelled', payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(refund, order.id);
    for (const item of db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)) {
      if (db.prepare('SELECT 1 FROM products WHERE id = ?').get(item.product_id)) adjustStock(item.product_id, item.quantity, 'Returned to stock', `Order #${order.id} cancelled`);
    }
    addHistory(order.id, 'Cancelled', note);
  })();
};
exports.cancelAndRestock = cancelAndRestock;

exports.cancelOrder = (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) return errorResponse(res, 404, 'Order not found');
    if (!CANCELLABLE.includes(order.status)) return errorResponse(res, 400, 'This order can no longer be cancelled');

    cancelAndRestock(order, 'Cancelled by customer');
    return successResponse(res, 200, null, 'Order cancelled');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

// Public order tracking: order number + the email used to place it (no login needed)
exports.trackOrder = (req, res) => {
  try {
    const id = String(req.query.orderId || '').replace(/\D/g, '');
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!id || !email) return errorResponse(res, 400, 'Enter your order number and email address');
    const order = db.prepare(`
      SELECT o.* FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ? AND LOWER(u.email) = ?
    `).get(id, email);
    if (!order) return errorResponse(res, 404, "We couldn't find an order with those details");
    const full = withDetails(order);
    return successResponse(res, 200, {
      id: full.id, status: full.status, payment_status: full.payment_status, payment_method: full.payment_method,
      total_amount: full.total_amount, created_at: full.created_at, courier: full.courier, tracking_number: full.tracking_number,
      city: full.address_snapshot.city, pincode: full.address_snapshot.pincode,
      items: full.items.map(i => ({ name: i.name, quantity: i.quantity, image: i.image })),
      history: full.history,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
