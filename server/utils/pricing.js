const dataStore = require('../dataStore');

const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_FEE = 99;

exports.evaluateCoupon = (code, orderAmount) => {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return { status: 400, error: 'Coupon code is required' };

  const coupon = dataStore.getCouponByCode(normalized);
  if (!coupon) return { status: 404, error: 'Invalid coupon code' };

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
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
