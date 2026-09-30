const QRCode = require('qrcode');
const { UPI_ID, UPI_PAYEE_NAME } = require('../config/payment');

// Builds a standard UPI payment link (NPCI "upi://pay" format) for an order.
// Any UPI app (GPay, PhonePe, Paytm, BHIM…) can scan it; the amount and note are pre-filled.
const buildUpiUri = (order) => {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_PAYEE_NAME,
    am: Number(order.total_amount).toFixed(2),
    cu: 'INR',
    tn: `StyleHub order ${order.id}`,
    tr: `SH${order.id}`,
  });
  // URLSearchParams encodes spaces as "+", which some UPI apps show literally
  // and keep "@" in the UPI ID literal, as UPI apps expect
  return `upi://pay?${params.toString().replace(/\+/g, '%20').replace(/%40/g, '@')}`;
};

const buildUpiPayment = async (order) => {
  const uri = buildUpiUri(order);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
  return { uri, qr, amount: Number(order.total_amount), upiId: UPI_ID, payeeName: UPI_PAYEE_NAME, orderId: order.id };
};

module.exports = { buildUpiPayment };
