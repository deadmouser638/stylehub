const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');
const { cleanText } = require('../utils/validate');

const validAddress = fields => {
  const limits = { name: 80, phone: 10, pincode: 6, address_line: 200, city: 80, state: 80 };
  const data = Object.fromEntries(Object.entries(limits).map(([key, max]) => [key, cleanText(fields[key], max)]));
  if (Object.values(data).some(value => !value) || !/^\d{10}$/.test(data.phone) || !/^[1-9]\d{5}$/.test(data.pincode)) return null;
  return { ...data, type: ['Home', 'Work'].includes(fields.type) ? fields.type : 'Home' };
};

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
  const input = validAddress(req.body);
  if (!input) return errorResponse(res, 400, 'Enter a valid name, 10-digit phone, 6-digit pincode and address');

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
    `).run(req.user.id, input.name, input.phone, input.pincode, input.address_line, input.city, input.state, input.type, makeDefault ? 1 : 0);

    return successResponse(res, 201, { id: info.lastInsertRowid }, 'Address added successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateAddress = (req, res) => {
  const { name, phone, pincode, address_line, city, state, type, is_default } = req.body;
  const existing = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return errorResponse(res, 404, 'Address not found');
  const input = validAddress({ ...existing, ...req.body });
  if (!input) return errorResponse(res, 400, 'Enter valid address details');
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
    `).run(input.name, input.phone, input.pincode, input.address_line, input.city, input.state, input.type, is_default !== undefined ? (is_default ? 1 : 0) : null, req.params.id, req.user.id);

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
