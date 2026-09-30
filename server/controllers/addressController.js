const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');

exports.getAddresses = (req, res) => {
  try {
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(req.user.id);
    return successResponse(res, 200, addresses);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.addAddress = (req, res) => {
  const { name, phone, pincode, address_line, city, state, type, is_default } = req.body;
  const required = { name, phone, pincode, address_line, city, state };
  const missing = Object.keys(required).filter(key => !String(required[key] || '').trim());
  if (missing.length) {
    return errorResponse(res, 400, `Missing required fields: ${missing.join(', ')}`);
  }

  try {
    // The user's first address becomes the default automatically
    const hasAddresses = db.prepare('SELECT 1 FROM addresses WHERE user_id = ?').get(req.user.id);
    const makeDefault = is_default || !hasAddresses;
    if (makeDefault) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    const info = db.prepare(`
      INSERT INTO addresses (user_id, name, phone, pincode, address_line, city, state, type, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name.trim(), phone.trim(), pincode.trim(), address_line.trim(), city.trim(), state.trim(), type || 'Home', makeDefault ? 1 : 0);

    return successResponse(res, 201, { id: info.lastInsertRowid }, 'Address added successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateAddress = (req, res) => {
  const { name, phone, pincode, address_line, city, state, type, is_default } = req.body;
  try {
    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    db.prepare(`
      UPDATE addresses 
      SET name = COALESCE(?, name), 
          phone = COALESCE(?, phone), 
          pincode = COALESCE(?, pincode), 
          address_line = COALESCE(?, address_line), 
          city = COALESCE(?, city), 
          state = COALESCE(?, state), 
          type = COALESCE(?, type), 
          is_default = COALESCE(?, is_default)
      WHERE id = ? AND user_id = ?
    `).run(name, phone, pincode, address_line, city, state, type, is_default !== undefined ? (is_default ? 1 : 0) : null, req.params.id, req.user.id);

    return successResponse(res, 200, null, 'Address updated');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.deleteAddress = (req, res) => {
  try {
    db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return successResponse(res, 200, null, 'Address deleted');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.setDefault = (req, res) => {
  try {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    return successResponse(res, 200, null, 'Default address set');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
