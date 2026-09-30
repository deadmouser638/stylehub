const express = require('express');
const admin = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/stats', admin.getStats);

router.get('/products/categories', admin.getProductCategories);
router.get('/products', admin.listProducts);
router.get('/products/:id', admin.getProduct);
router.post('/products', admin.createProduct);
router.put('/products/:id', admin.updateProduct);
router.delete('/products/:id', admin.deleteProduct);

router.get('/coupons', admin.listCoupons);
router.post('/coupons', admin.createCoupon);
router.put('/coupons/:id', admin.updateCoupon);
router.delete('/coupons/:id', admin.deleteCoupon);

router.get('/offers', admin.listOffers);
router.post('/offers', admin.createOffer);
router.put('/offers/:id', admin.updateOffer);
router.delete('/offers/:id', admin.deleteOffer);

router.get('/inventory/summary', admin.getInventorySummary);
router.get('/inventory/movements', admin.listMovements);
router.post('/inventory/:id/adjust', admin.adjustInventory);

router.get('/orders', admin.listOrders);
router.put('/orders/:id', admin.updateOrder);
router.delete('/orders/:id', admin.deleteOrder);

module.exports = router;
