require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./db');

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
app.use(helmet({ contentSecurityPolicy: false })); // Security headers
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Request logging

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
  res.status(200).json({ status: 'ok', message: 'ElectroHub API is running' });
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

// Active home page banners and header ticker messages
app.get('/api/offers', (req, res) => {
  const offers = db.prepare(`
    SELECT id, title, subtitle, cta_label, link, image, placement FROM offers
    WHERE is_active = 1
      AND (starts_at IS NULL OR starts_at <= datetime('now'))
      AND (ends_at IS NULL OR ends_at > datetime('now'))
    ORDER BY position, id
  `).all();
  res.json({ success: true, message: 'Success', data: offers });
});

app.use('/api', reviewRoutes); // Review routes include /api/products/:productId/reviews

// Serve the built app from the same origin for a one-command demo.
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'Endpoint not found' });
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Basic Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
