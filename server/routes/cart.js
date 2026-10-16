const express = require('express');
const { getCart, addToCart, updateQuantity, removeFromCart, clearCart } = require('../controllers/cartController');

const router = express.Router();

// Stateless session cart routes (works for guest or logged in)
router.get('/', getCart);
router.post('/', addToCart);
router.put('/:itemId', updateQuantity);
router.delete('/:itemId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
