const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const { JWT_SECRET } = require('../config/auth');

exports.protect = (req, res, next) => {
  let token;

  if (/^Bearer\s+\S+$/i.test(req.headers.authorization || '')) {
    token = req.headers.authorization.split(/\s+/)[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized to access this route');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = {
      id: decoded.id,
      name: decoded.name || 'Demo User',
      email: decoded.email,
      role: decoded.role || 'customer'
    };
    next();
  } catch (err) {
    return errorResponse(res, 401, 'Invalid or expired authentication token');
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return errorResponse(res, 403, 'Admin access required');
  }
  next();
};
