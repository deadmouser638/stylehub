const { successResponse, errorResponse } = require('../utils/response');
const { cleanText } = require('../utils/validate');
const { getSessionData, setSessionCookie } = require('../config/session');

const validAddress = (fields) => {
  if (!fields || typeof fields !== 'object') return null;
  const name = cleanText(fields.name, 80);
  const phone = cleanText(fields.phone, 15);
  const pincode = cleanText(fields.pincode, 10);
  const address_line = cleanText(fields.address_line, 200);
  const city = cleanText(fields.city, 80);
  const state = cleanText(fields.state, 80);
  if (!name || !phone || !pincode || !address_line || !city || !state) return null;
  return {
    id: fields.id || Date.now(),
    name,
    phone,
    pincode,
    address_line,
    city,
    state,
    type: ['Home', 'Work'].includes(fields.type) ? fields.type : 'Home',
    is_default: Boolean(fields.is_default)
  };
};

exports.getAddresses = (req, res) => {
  try {
    const session = getSessionData(req);
    return successResponse(res, 200, session.addresses || []);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.addAddress = (req, res) => {
  const input = validAddress(req.body);
  if (!input) return errorResponse(res, 400, 'Enter a valid name, phone, pincode and address');

  try {
    const session = getSessionData(req);
    const addresses = session.addresses || [];
    if (addresses.length === 0 || input.is_default) {
      addresses.forEach(a => { a.is_default = false; });
      input.is_default = true;
    }
    input.id = Date.now();
    addresses.push(input);
    session.addresses = addresses;
    setSessionCookie(res, session);

    return successResponse(res, 201, { id: input.id }, 'Address saved in session');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateAddress = (req, res) => {
  const session = getSessionData(req);
  const addresses = session.addresses || [];
  const idx = addresses.findIndex(a => String(a.id) === String(req.params.id));
  if (idx === -1) return errorResponse(res, 404, 'Address not found');

  const updated = validAddress({ ...addresses[idx], ...req.body });
  if (!updated) return errorResponse(res, 400, 'Enter valid address details');

  if (updated.is_default) {
    addresses.forEach(a => { a.is_default = false; });
  }
  addresses[idx] = updated;
  session.addresses = addresses;
  setSessionCookie(res, session);

  return successResponse(res, 200, null, 'Address updated');
};

exports.deleteAddress = (req, res) => {
  try {
    const session = getSessionData(req);
    session.addresses = (session.addresses || []).filter(a => String(a.id) !== String(req.params.id));
    setSessionCookie(res, session);
    return successResponse(res, 200, null, 'Address removed');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.setDefault = (req, res) => {
  try {
    const session = getSessionData(req);
    (session.addresses || []).forEach(a => {
      a.is_default = String(a.id) === String(req.params.id);
    });
    setSessionCookie(res, session);
    return successResponse(res, 200, null, 'Default address set');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};
