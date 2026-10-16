const dataStore = require('../dataStore');
const { successResponse, errorResponse } = require('../utils/response');
const { evaluateCoupon } = require('../utils/pricing');

exports.getCoupons = (req, res) => {
  try {
    const coupons = dataStore.getCoupons()
      .filter(c => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date()))
      .sort((a, b) => a.min_order - b.min_order)
      .map(c => ({
        ...c,
        type: c.discount_type || c.type,
        value: c.discount_value || c.value,
        description: (c.discount_type || c.type) === 'PERCENTAGE'
          ? `${c.discount_value || c.value}% off on orders above ₹${c.min_order}`
          : `Flat ₹${c.discount_value || c.value} off on orders above ₹${c.min_order}`,
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
    return successResponse(res, 200, {
      discount,
      code: coupon.code,
      type: coupon.discount_type || coupon.type,
      value: coupon.discount_value || coupon.value
    }, 'Coupon applied successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
