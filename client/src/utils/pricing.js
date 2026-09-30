// Mirrors server/utils/pricing.js so the totals shown match what the order is charged
const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_FEE = 99;

export const discountedPrice = (item) => item.price - (item.price * item.discount_percent / 100);

export const getCartSummary = (cart, appliedCoupon) => {
  let totalMrp = 0;
  let subtotal = 0;

  cart.forEach(item => {
    totalMrp += item.price * item.quantity;
    subtotal += discountedPrice(item) * item.quantity;
  });

  let couponDiscount = 0;
  if (appliedCoupon) {
    couponDiscount = appliedCoupon.type === 'PERCENTAGE'
      ? (subtotal * appliedCoupon.value) / 100
      : appliedCoupon.value;
    couponDiscount = Math.min(couponDiscount, subtotal);
  }

  const afterDiscount = subtotal - couponDiscount;
  const deliveryFee = cart.length > 0 && afterDiscount <= FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;

  return {
    totalMrp,
    mrpDiscount: totalMrp - subtotal,
    subtotal,
    couponDiscount,
    deliveryFee,
    total: Math.round(afterDiscount + deliveryFee),
  };
};
