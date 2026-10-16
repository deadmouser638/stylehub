const cleanText = (value, max = 200) => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > max || /[\u0000-\u001f<>]/.test(text)) return null;
  return text;
};
const email = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
module.exports = { cleanText, email };
