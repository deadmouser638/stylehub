const express = require('express');
const { createOrder, getMyOrders, getOrderById, cancelOrder, trackOrder } = require('../controllers/orderController');

const router = express.Router();

// Public track route
router.get('/track', trackOrder);

// Guest-friendly stateless orders
router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

module.exports = router;
