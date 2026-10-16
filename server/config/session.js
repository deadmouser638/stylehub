/**
 * Signed Session Utilities
 * Uses HMAC-SHA256 with JWT_SECRET to tamper-proof guest cart, address, and demo orders.
 */
const crypto = require('crypto');
const { JWT_SECRET } = require('./auth');

const COOKIE_NAME = 'electrohub_session';

const signData = (data) => {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyData = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const sigBuf = Buffer.from(sig);
  const expectedSigBuf = Buffer.from(crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url'));
  if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

const setSessionCookie = (res, data) => {
  const signed = signData(data);
  res.cookie(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

const getSessionData = (req) => {
  const cookie = req.cookies ? req.cookies[COOKIE_NAME] : null;
  return verifyData(cookie) || { cart: [], addresses: [], demoOrders: [] };
};

module.exports = {
  COOKIE_NAME,
  signData,
  verifyData,
  setSessionCookie,
  getSessionData
};
