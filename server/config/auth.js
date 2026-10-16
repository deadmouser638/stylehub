const crypto = require('crypto');

// A missing deployment secret must never fall back to a publicly known value.
// Ephemeral sessions are acceptable for a local demo; hosted auth requires a
// stable, private secret configured in the deployment environment.
const configured = process.env.JWT_SECRET;
const unsafe = !configured || configured.length < 32 || configured.includes('your_jwt_secret') || configured === 'stylehub_super_secret_jwt_key_2026';
if (process.env.VERCEL && unsafe) {
  throw new Error('Set a private JWT_SECRET of at least 32 characters in Vercel environment settings');
}
const JWT_SECRET = !unsafe ? configured : crypto.randomBytes(48).toString('hex');
if (unsafe && !process.env.VERCEL) console.warn('Private JWT_SECRET not set: login sessions end when this demo server restarts');

module.exports = { JWT_SECRET };
