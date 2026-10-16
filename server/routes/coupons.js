const express = require('express');
const { applyCoupon, getCoupons } = require('../controllers/couponController');

const router = express.Router();

router.get('/', getCoupons);
router.post('/apply', applyCoupon);

module.exports = router;
