// ============================================================================
//  PAYMENT SETTINGS: edit this file to receive real payments.
// ============================================================================
//
//  UPI: customers scan a QR code (or tap "Open UPI app" on their phone) and pay
//  this UPI ID directly. The exact order amount and order number are filled in
//  automatically. Put YOUR UPI ID below, e.g. 'yourname@okhdfcbank' or
//  '9876543210@ybl', and the name that should appear in the customer's UPI app.
//
//  Card (optional): add your Razorpay keys to server/.env to enable card payments:
//      RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
//      RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
//  Without keys, the card option is shown as unavailable at checkout.
// ============================================================================

module.exports = {
  UPI_ID: process.env.UPI_ID || 'yourname@upi',        // <-- CHANGE THIS to your UPI ID
  UPI_PAYEE_NAME: process.env.UPI_PAYEE_NAME || 'StyleHub', // <-- name shown in the UPI app

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
};
