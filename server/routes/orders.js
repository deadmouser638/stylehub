const express = require('express');
const { createOrder, getMyOrders, getOrderById, cancelOrder, trackOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/track', trackOrder);
router.use(protect);

router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
