const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../utils/response');
const { cleanText } = require('../utils/validate');
const { JWT_SECRET } = require('../config/auth');

// Private admin configuration from environment
const DEMO_ADMIN_EMAIL = (process.env.DEMO_ADMIN_EMAIL || '').trim().toLowerCase();
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || '';

// Known demo customer
const DEMO_USER = {
  id: 1,
  name: 'Demo Shopper',
  email: 'demo@electrohub.com',
  phone: '9876543210',
  gender: 'Other',
  role: 'customer'
};

const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '12h'
  });
};

exports.register = async (req, res) => {
  const { name, password, phone, gender } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!name || !email || !password) {
    return errorResponse(res, 400, 'Name, email and password are required');
  }
  if (!cleanText(name, 80) || typeof password !== 'string' || password.length < 12) {
    return errorResponse(res, 400, 'Name must be under 80 characters and password at least 12 characters');
  }

  // Stateless demo account session
  const user = {
    id: Math.floor(1000 + Math.random() * 9000),
    name: name.trim(),
    email,
    phone: phone || null,
    gender: gender || null,
    role: 'customer'
  };

  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  return successResponse(res, 201, { user, token, disclaimer: 'Demo Session: Account exists for current browser session only.' }, 'Demo account active');
};

exports.login = async (req, res) => {
  const { password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email || !password) {
    return errorResponse(res, 400, 'Email and password are required');
  }

  // Check private admin credentials
  if (DEMO_ADMIN_EMAIL && email === DEMO_ADMIN_EMAIL) {
    if (password === DEMO_ADMIN_PASSWORD) {
      const adminUser = {
        id: 9999,
        name: 'Store Admin',
        email: DEMO_ADMIN_EMAIL,
        role: 'admin'
      };
      const token = signToken({ id: adminUser.id, email: adminUser.email, name: adminUser.name, role: 'admin' });
      return successResponse(res, 200, { user: adminUser, token }, 'Logged in as Admin');
    }
    return errorResponse(res, 401, 'Invalid credentials');
  }

  // Check standard demo customer
  if (email === 'demo@electrohub.com') {
    if (password === 'Demo@123') {
      const token = signToken({ id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name, role: DEMO_USER.role });
      return successResponse(res, 200, { user: DEMO_USER, token }, 'Logged in successfully');
    }
    return errorResponse(res, 401, 'Invalid password for demo user (use Demo@123)');
  }

  // For any other customer login in this demo storefront, issue a clean demo session
  const user = {
    id: Math.floor(1000 + Math.random() * 9000),
    name: email.split('@')[0],
    email,
    role: 'customer'
  };
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: 'customer' });
  return successResponse(res, 200, { user, token }, 'Logged in to demo session');
};

exports.getMe = (req, res) => {
  return successResponse(res, 200, req.user);
};

exports.updateProfile = (req, res) => {
  const { name, phone, gender } = req.body;
  const updated = {
    ...req.user,
    name: cleanText(name, 80) || req.user.name,
    phone: cleanText(phone, 15) || req.user.phone,
    gender: gender || req.user.gender
  };
  return successResponse(res, 200, updated, 'Demo profile updated');
};

exports.changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return errorResponse(res, 400, 'Current and new password are required');
  }
  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    return errorResponse(res, 400, 'New password must be at least 12 characters');
  }
  return successResponse(res, 200, null, 'Demo password updated for current session');
};
