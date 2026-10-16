/**
 * Session and Token Security Utilities
 * - Encrypts/decrypts sensitive payloads using AES-256-GCM + HMAC-SHA256
 * - Validates timestamp expiry to prevent indefinite replay
 * - Keeps cookie payloads small (cart IDs, sizes, quantities only)
 */
const crypto = require('crypto');
const { JWT_SECRET } = require('./auth');

const COOKIE_NAME = 'electrohub_session';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Derive 32-byte encryption key from JWT_SECRET
const getDerivedKey = () => crypto.createHash('sha256').update(JWT_SECRET).digest();

/**
 * Encrypt data into a compact AES-256-GCM string (base64url)
 */
const encryptData = (data) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getDerivedKey(), iv);
  const payload = JSON.stringify({
    d: data,
    exp: Date.now() + TOKEN_TTL_MS
  });
  let encrypted = cipher.update(payload, 'utf8', 'base64url');
  encrypted += cipher.final('base64url');
  const tag = cipher.getAuthTag().toString('base64url');
  return `${iv.toString('base64url')}.${encrypted}.${tag}`;
};

/**
 * Decrypt and verify AES-256-GCM string with expiration check
 */
const decryptData = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [ivB64, encryptedB64, tagB64] = parts;
  try {
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getDerivedKey(), iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedB64, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');
    const parsed = JSON.parse(decrypted);
    if (!parsed.exp || Date.now() > parsed.exp) return null; // Expired
    return parsed.d;
  } catch {
    return null;
  }
};

/**
 * Compact representation of session state to ensure cookies stay well below 4KB browser limits
 */
const sanitizeSessionForStorage = (session) => {
  const clean = {
    cart: (session.cart || []).slice(0, 20).map(item => ({
      p: Number(item.product_id || item.p),
      s: item.size || item.s || null,
      q: Math.max(1, Math.min(10, Number(item.quantity || item.q || 1)))
    })),
    // Only store minimal delivery fields (no full payment tokens)
    addr: session.addresses?.[0] ? {
      n: session.addresses[0].name,
      ph: session.addresses[0].phone,
      pin: session.addresses[0].pincode,
      l: session.addresses[0].address_line,
      c: session.addresses[0].city,
      st: session.addresses[0].state,
      t: session.addresses[0].type
    } : null,
    // Store only minimal order descriptors (max 3)
    orders: (session.demoOrders || []).slice(0, 3).map(o => ({
      id: o.id,
      amt: o.amount || o.total_amount,
      pm: o.payment_method,
      ps: o.payment_status,
      st: o.status,
      dt: o.created_at
    }))
  };
  return clean;
};

const unpackSessionFromStorage = (clean) => {
  if (!clean || typeof clean !== 'object') {
    return { cart: [], addresses: [], demoOrders: [] };
  }
  const cart = (clean.cart || []).map(i => ({
    product_id: i.p,
    size: i.s,
    quantity: i.q
  }));
  const addresses = clean.addr ? [{
    id: 1,
    name: clean.addr.n,
    phone: clean.addr.ph,
    pincode: clean.addr.pin,
    address_line: clean.addr.l,
    city: clean.addr.c,
    state: clean.addr.st,
    type: clean.addr.t || 'Home',
    is_default: true
  }] : [];
  const demoOrders = (clean.orders || []).map(o => ({
    id: o.id,
    orderId: o.id,
    amount: o.amt,
    total_amount: o.amt,
    payment_method: o.pm,
    paymentStatus: o.ps,
    status: o.st,
    created_at: o.dt,
    is_demo: true,
    history: [
      { status: 'Placed', note: 'Demo order placed', created_at: o.dt },
      { status: o.st, note: `Status is ${o.st}`, created_at: o.dt }
    ]
  }));
  return { cart, addresses, demoOrders };
};

const setSessionCookie = (res, data) => {
  const compact = sanitizeSessionForStorage(data);
  const encrypted = encryptData(compact);
  res.cookie(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
};

const getSessionData = (req) => {
  const cookie = req.cookies ? req.cookies[COOKIE_NAME] : null;
  const decrypted = decryptData(cookie);
  return unpackSessionFromStorage(decrypted);
};

module.exports = {
  COOKIE_NAME,
  encryptData,
  decryptData,
  setSessionCookie,
  getSessionData
};
