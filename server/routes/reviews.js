const express = require('express');
const { addReview, getReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/products/:productId/reviews', getReviews);
router.post('/products/:productId/reviews', protect, addReview);

module.exports = router;
