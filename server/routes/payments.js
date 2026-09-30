const express = require('express');
const { getConfig, getUpiPayment, confirmUpiPayment, createRazorpayOrder, verifyRazorpayPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/config', getConfig);
router.get('/upi/:orderId', protect, getUpiPayment);
router.post('/upi/:orderId/confirm', protect, confirmUpiPayment);
router.post('/razorpay/:orderId', protect, createRazorpayOrder);
router.post('/razorpay/:orderId/verify', protect, verifyRazorpayPayment);

module.exports = router;
