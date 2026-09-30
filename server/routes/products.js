const express = require('express');
const {
  getProducts,
  getProductById,
  getRelatedProducts,
  getSuggestions,
  getTrending,
  getNewArrivals,
  getDeals,
  getTopRated,
  getCategories,
  getProductsByIds,
} = require('../controllers/productController');

const router = express.Router();

router.get('/suggestions', getSuggestions);
router.get('/categories', getCategories);
router.get('/trending', getTrending);
router.get('/new-arrivals', getNewArrivals);
router.get('/deals', getDeals);
router.get('/top-rated', getTopRated);
router.get('/batch', getProductsByIds);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/:id/related', getRelatedProducts);

module.exports = router;
