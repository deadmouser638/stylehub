const crypto = require('crypto');
const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');
const { buildUpiPayment } = require('../utils/upi');
const { UPI_ID, UPI_PAYEE_NAME, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../config/payment');
const { addHistory } = require('../utils/inventory');

const cardEnabled = () => Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

const ownOrder = (req) => db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.orderId, req.user.id);

exports.getConfig = (req, res) => successResponse(res, 200, {
  upi: { enabled: true, upiId: UPI_ID, payeeName: UPI_PAYEE_NAME },
  card: { enabled: cardEnabled() },
  cod: { enabled: true },
});

// QR code / payment link for an order that is still waiting for its UPI payment
exports.getUpiPayment = async (req, res) => {
  try {
    const order = ownOrder(req);
    if (!order) return errorResponse(res, 404, 'Order not found');
    if (order.payment_method !== 'UPI') return errorResponse(res, 400, 'This order is not a UPI order');
    if (order.status === 'Cancelled') return errorResponse(res, 400, 'This order was cancelled');
    if (order.payment_status !== 'Pending') return errorResponse(res, 400, `Payment is already ${order.payment_status.toLowerCase()}`);
    return successResponse(res, 200, await buildUpiPayment(order));
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

// The customer submits the UPI transaction reference (UTR) shown in their UPI app.
// UPI has no automatic callback without a payment gateway, so the store owner
// verifies the UTR against their bank statement from the admin panel.
exports.confirmUpiPayment = (req, res) => {
  try {
    const utr = String(req.body.utr || '').replace(/\s/g, '');
    if (!/^\d{12}$/.test(utr)) return errorResponse(res, 400, 'Please enter the 12-digit UTR / transaction reference number from your UPI app');

    const order = ownOrder(req);
    if (!order) return errorResponse(res, 404, 'Order not found');
    if (order.payment_method !== 'UPI' || order.payment_status !== 'Pending' || order.status === 'Cancelled') {
      return errorResponse(res, 400, 'This order is not waiting for a UPI payment');
    }
    const duplicate = db.prepare('SELECT id FROM orders WHERE payment_ref = ? AND id != ?').get(utr, order.id);
    if (duplicate) return errorResponse(res, 400, 'This UTR has already been used for another order');

    db.prepare("UPDATE orders SET payment_status = 'Verifying', payment_ref = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(utr, order.id);
    addHistory(order.id, 'Payment submitted', `UPI reference ${utr}`);
    return successResponse(res, 200, { paymentStatus: 'Verifying' }, 'Thanks! We are verifying your payment.');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

// Creates a Razorpay order so the customer can pay by card in Razorpay Checkout
exports.createRazorpayOrder = async (req, res) => {
  if (!cardEnabled()) return errorResponse(res, 400, 'Card payments are not configured');
  try {
    const order = ownOrder(req);
    if (!order) return errorResponse(res, 404, 'Order not found');
    if (order.payment_status !== 'Pending' || order.status === 'Cancelled') return errorResponse(res, 400, 'This order is not waiting for payment');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({ amount: Math.round(order.total_amount * 100), currency: 'INR', receipt: `SH${order.id}` }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Razorpay error', data);
      return errorResponse(res, 502, data.error?.description || 'Could not start card payment');
    }

    db.prepare('UPDATE orders SET gateway_order_id = ? WHERE id = ?').run(data.id, order.id);
    return successResponse(res, 200, {
      keyId: RAZORPAY_KEY_ID,
      razorpayOrderId: data.id,
      amount: data.amount,
      currency: data.currency,
      name: UPI_PAYEE_NAME,
      prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone || '' },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

// Razorpay Checkout returns a signature; a matching HMAC proves the payment is genuine
exports.verifyRazorpayPayment = (req, res) => {
  if (!cardEnabled()) return errorResponse(res, 400, 'Card payments are not configured');
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = ownOrder(req);
    if (!order) return errorResponse(res, 404, 'Order not found');
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return errorResponse(res, 400, 'Missing payment details');

    if (order.payment_method !== 'Card' || order.payment_status !== 'Pending' || order.status === 'Cancelled' || order.gateway_order_id !== razorpay_order_id) return errorResponse(res, 400, 'Payment does not match this pending order');

    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    const valid = expected.length === razorpay_signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!valid) return errorResponse(res, 400, 'Payment verification failed');

    db.prepare("UPDATE orders SET payment_status = 'Paid', payment_ref = ?, status = 'Confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(razorpay_payment_id, order.id);
    addHistory(order.id, 'Confirmed', 'Card payment received');
    return successResponse(res, 200, { paymentStatus: 'Paid' }, 'Payment successful');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
