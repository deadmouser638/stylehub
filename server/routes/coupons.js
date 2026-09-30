const express = require('express');
const { applyCoupon, getCoupons } = require('../controllers/couponController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', getCoupons);
router.post('/apply', protect, applyCoupon);

module.exports = router;
