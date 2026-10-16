const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');
const db = require('../db');

const { JWT_SECRET } = require('../config/auth');

exports.protect = (req, res, next) => {
  let token;

  if (/^Bearer\s+\S+$/.test(req.headers.authorization || '')) {
    token = req.headers.authorization.split(/\s+/)[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized to access this route');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    const user = db.prepare('SELECT id, name, email, phone, gender, role, created_at FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return errorResponse(res, 401, 'The user belonging to this token no longer exists.');
    }

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 401, 'Not authorized to access this route');
  }
};

// Use after `protect`: only admin accounts may continue
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return errorResponse(res, 403, 'Admin access required');
  }
  next();
};
