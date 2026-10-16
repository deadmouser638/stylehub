require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('./config/auth');
const dataStore = require('./dataStore');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const addressRoutes = require('./routes/addresses');
const couponRoutes = require('./routes/coupons');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');

const app = express();
const path = require('path');

// Middleware
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '64kb', strict: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

// Cache-Control headers ensuring real-time fresh data
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path.startsWith('/api/products') || req.path === '/api/offers')) {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  } else if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/cart') || req.path.startsWith('/api/orders') || req.path.startsWith('/api/addresses') || req.path.startsWith('/api/admin')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ElectroHub Stateless API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

// Active home page banners and header ticker messages from dataStore
app.get('/api/offers', (req, res) => {
  const offers = dataStore.getOffers()
    .filter(o => o.is_active)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  res.json({ success: true, message: 'Success', data: offers });
});

app.use('/api', reviewRoutes);

// Serve client in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'Endpoint not found' });
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.status === 400 ? 'Invalid request body' : 'Internal Server Error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
