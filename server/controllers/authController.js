const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');
const { cleanText } = require('../utils/validate');

const { JWT_SECRET } = require('../config/auth');

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '12h',
  });
};

exports.register = async (req, res) => {
  const { name, password, phone, gender } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!name || !email || !password) {
    return errorResponse(res, 400, 'Name, email and password are required');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return errorResponse(res, 400, 'Please enter a valid email address');
  }
  if (!cleanText(name, 80) || typeof password !== 'string' || password.length < 12 || password.length > 128 || email.length > 254) {
    return errorResponse(res, 400, 'Use a name under 80 characters and a password of 12–128 characters');
  }

  try {
    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
    if (existingUser) {
      return errorResponse(res, 400, 'User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const insert = db.prepare('INSERT INTO users (name, email, password_hash, phone, gender) VALUES (?, ?, ?, ?, ?)');
    const info = insert.run(name.trim(), email, password_hash, phone || null, gender || null);

    const user = { id: info.lastInsertRowid, name: name.trim(), email, phone: phone || null, gender: gender || null, role: 'customer' };
    const token = signToken(user.id);

    return successResponse(res, 201, { user, token }, 'User registered successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.login = async (req, res) => {
  const { password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email || !password) {
    return errorResponse(res, 400, 'Email and password are required');
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const token = signToken(user.id);
    const { password_hash, ...userWithoutPassword } = user;

    return successResponse(res, 200, { user: userWithoutPassword, token }, 'Logged in successfully');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 500, 'Server error during login');
  }
};

exports.getMe = (req, res) => {
  return successResponse(res, 200, req.user);
};

exports.updateProfile = (req, res) => {
  const { name, phone, gender } = req.body;
  if (name !== undefined && !cleanText(name, 80)) return errorResponse(res, 400, 'Enter a valid name under 80 characters');
  if (phone !== undefined && phone !== null && phone !== '' && (typeof phone !== 'string' || !/^\d{10}$/.test(phone))) return errorResponse(res, 400, 'Enter a valid phone number');
  if (gender !== undefined && gender !== null && gender !== '' && !['Male', 'Female', 'Other'].includes(gender)) return errorResponse(res, 400, 'Invalid profile option');
  try {
    const update = db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), gender = COALESCE(?, gender) WHERE id = ?');
    update.run(name, phone, gender, req.user.id);

    const updatedUser = db.prepare('SELECT id, name, email, phone, gender, role, created_at FROM users WHERE id = ?').get(req.user.id);
    return successResponse(res, 200, updatedUser, 'Profile updated successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return errorResponse(res, 400, 'Current and new password are required');
  }
  if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
    return errorResponse(res, 400, 'New password must be 12–128 characters');
  }

  try {
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 400, 'Incorrect current password');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
    return successResponse(res, 200, null, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
