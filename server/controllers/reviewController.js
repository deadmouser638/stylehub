const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');

exports.addReview = (req, res) => {
  const { productId } = req.params;
  const { comment } = req.body;
  const rating = Number(req.body.rating);
  const user_id = req.user.id;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return errorResponse(res, 400, 'Rating must be a whole number from 1 to 5');
  }

  try {
    const product = db.prepare('SELECT id, rating, rating_count FROM products WHERE id = ?').get(productId);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const existingReview = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?').get(user_id, productId);
    if (existingReview) {
      return errorResponse(res, 400, 'You have already reviewed this product');
    }

    db.transaction(() => {
      db.prepare('INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)').run(user_id, productId, rating, comment || null);
      
      const newCount = product.rating_count + 1;
      const newRating = ((product.rating * product.rating_count) + rating) / newCount;

      db.prepare('UPDATE products SET rating = ?, rating_count = ? WHERE id = ?').run(Number(newRating.toFixed(1)), newCount, productId);
    })();

    return successResponse(res, 201, null, 'Review added successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getReviews = (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.product_id = ? 
      ORDER BY r.created_at DESC
    `).all(req.params.productId);
    
    return successResponse(res, 200, reviews);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
