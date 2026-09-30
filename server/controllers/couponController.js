const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');
const { evaluateCoupon } = require('../utils/pricing');

exports.getCoupons = (req, res) => {
  try {
    const coupons = db.prepare(`
      SELECT code, discount_type AS type, discount_value AS value, min_order
      FROM coupons WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY min_order ASC
    `).all().map(c => ({
      ...c,
      description: c.type === 'PERCENTAGE'
        ? `${c.value}% off on orders above ₹${c.min_order}`
        : `Flat ₹${c.value} off on orders above ₹${c.min_order}`,
    }));
    return successResponse(res, 200, coupons);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.applyCoupon = (req, res) => {
  const { code, orderAmount } = req.body;
  try {
    const result = evaluateCoupon(code, Number(orderAmount) || 0);
    if (result.error) return errorResponse(res, result.status, result.error);

    const { coupon, discount } = result;
    return successResponse(res, 200, { discount, code: coupon.code, type: coupon.discount_type, value: coupon.discount_value }, 'Coupon applied successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
