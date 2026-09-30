const db = require('../db');

const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_FEE = 99;

// Looks up a coupon and checks it against an order amount.
// Returns { coupon, discount } on success or { error, status } on failure.
exports.evaluateCoupon = (code, orderAmount) => {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return { status: 400, error: 'Coupon code is required' };

  const coupon = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = ? AND is_active = 1').get(normalized);
  if (!coupon) return { status: 404, error: 'Invalid coupon code' };

  // expires_at is stored by SQLite as UTC ("YYYY-MM-DD HH:MM:SS"); NULL means it never expires
  if (coupon.expires_at && new Date(coupon.expires_at.replace(' ', 'T') + 'Z') < new Date()) {
    return { status: 400, error: 'Coupon has expired' };
  }

  if (orderAmount < coupon.min_order) {
    return { status: 400, error: `Minimum order amount for this coupon is Rs. ${coupon.min_order}` };
  }

  let discount = 0;
  if (coupon.discount_type === 'PERCENTAGE') {
    discount = (orderAmount * coupon.discount_value) / 100;
  } else if (coupon.discount_type === 'FLAT') {
    discount = coupon.discount_value;
  }

  return { coupon, discount: Math.min(discount, orderAmount) };
};

exports.getDeliveryFee = (amountAfterDiscounts) =>
  amountAfterDiscounts > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
