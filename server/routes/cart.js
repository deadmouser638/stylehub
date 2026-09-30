const express = require('express');
const { getCart, addToCart, updateQuantity, removeFromCart, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.post('/', addToCart);
router.put('/:itemId', updateQuantity);
router.delete('/:itemId', removeFromCart);
router.delete('/', clearCart);

module.exports = router;
