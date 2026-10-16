/**
 * Memory Catalog Store - Database-free authoritative catalog and demo state
 * All catalog data, offers, coupons, and reviews are sourced from backend data files.
 */
const fs = require('fs');
const path = require('path');

// Authoritative in-memory products dataset bundled directly with require
let products = require('./data/products.json');
let offers = require('./data/offers.json');
let coupons = require('./data/coupons.json');
let reviews = require('./data/reviews.json');

// Quick lookup maps
let productsById = new Map();
const refreshLookup = () => {
  productsById = new Map(products.map(p => [p.id, p]));
};
refreshLookup();

// Recalculate rating and review counts accurately from real demo reviews
const syncProductRatings = () => {
  const reviewsByProduct = new Map();
  for (const r of reviews) {
    if (!reviewsByProduct.has(r.product_id)) reviewsByProduct.set(r.product_id, []);
    reviewsByProduct.get(r.product_id).push(r);
  }
  for (const p of products) {
    const pReviews = reviewsByProduct.get(p.id) || [];
    p.rating_count = pReviews.length;
    p.rating = pReviews.length > 0
      ? Number((pReviews.reduce((sum, r) => sum + r.rating, 0) / pReviews.length).toFixed(1))
      : (p.rating || 4.2);
  }
};
syncProductRatings();

module.exports = {
  getProducts: () => products,
  getProductById: (id) => productsById.get(Number(id)),
  getOffers: () => offers,
  getCoupons: () => coupons,
  getCouponByCode: (code) => coupons.find(c => c.code.toUpperCase() === String(code || '').trim().toUpperCase() && c.is_active),
  getReviewsForProduct: (productId) => reviews.filter(r => r.product_id === Number(productId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  addReview: (productId, reviewData) => {
    const id = reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1;
    const review = {
      id,
      product_id: Number(productId),
      user_id: reviewData.user_id || 1,
      user_name: reviewData.user_name || 'Demo Reviewer',
      rating: Number(reviewData.rating),
      comment: reviewData.comment || '',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    reviews.unshift(review);
    syncProductRatings();
    return review;
  },
  // In-memory demo mutations (acknowledged as ephemeral on serverless instances)
  updateProductStock: (productId, delta) => {
    const p = productsById.get(Number(productId));
    if (p) {
      p.stock = Math.max(0, p.stock + delta);
      return p.stock;
    }
    return 0;
  },
  setProductStock: (productId, stock) => {
    const p = productsById.get(Number(productId));
    if (p) {
      p.stock = Math.max(0, Math.round(Number(stock)));
      return p.stock;
    }
    return 0;
  },
  saveProduct: (productData) => {
    if (productData.id) {
      const idx = products.findIndex(p => p.id === Number(productData.id));
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...productData };
        refreshLookup();
        return products[idx];
      }
    }
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      ...productData,
      id: newId,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      is_active: productData.is_active ?? 1,
      rating: 0,
      rating_count: 0
    };
    products.unshift(newProduct);
    refreshLookup();
    return newProduct;
  },
  deleteProduct: (productId) => {
    products = products.filter(p => p.id !== Number(productId));
    refreshLookup();
  }
};
