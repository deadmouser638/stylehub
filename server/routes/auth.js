const express = require('express');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  message: { success: false, message: 'Too many attempts from this IP, please try again after 15 minutes' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

router.use(protect);
router.get('/me', getMe);
router.put('/me', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;
