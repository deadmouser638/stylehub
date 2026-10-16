const dataStore = require('../dataStore');
const { successResponse, errorResponse } = require('../utils/response');
const { cleanText } = require('../utils/validate');

exports.addReview = (req, res) => {
  const { productId } = req.params;
  const { comment } = req.body;
  const rating = Number(req.body.rating);
  const user = req.user || { id: 1, name: 'Demo Shopper' };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return errorResponse(res, 400, 'Rating must be a whole number from 1 to 5');
  }
  if (comment != null && comment !== '' && !cleanText(comment, 500)) {
    return errorResponse(res, 400, 'Review must be plain text under 500 characters');
  }

  try {
    const product = dataStore.getProductById(productId);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const review = dataStore.addReview(productId, {
      user_id: user.id,
      user_name: user.name,
      rating,
      comment
    });

    return successResponse(res, 201, review, 'Demo review added');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getReviews = (req, res) => {
  try {
    const reviews = dataStore.getReviewsForProduct(req.params.productId);
    return successResponse(res, 200, reviews);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
