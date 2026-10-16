const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatPrice = (value) => `₹${inr.format(Math.round(Number(value) || 0))}`;

export const sellingPrice = (product) => product.price - (product.price * product.discount_percent / 100);

// Support UTC timestamps from both the legacy SQLite seed and ISO API responses.
export const parseDbDate = (value) => {
  const text = String(value || '').trim();
  if (!text) return new Date(NaN);
  return new Date(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(text) ? `${text.replace(' ', 'T')}Z` : text);
};

export const formatDate = (value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  parseDbDate(value).toLocaleDateString('en-IN', opts);

export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Swatch colours for the named product colours used in the catalog
export const COLOR_SWATCHES = {
  Black: '#111111', White: '#ffffff', Grey: '#8b8b94', Navy: '#1e2a4a', Blue: '#2563eb',
  Red: '#dc2626', Maroon: '#7f1d1d', Pink: '#ec4899', Purple: '#7e22ce', Green: '#15803d',
  Olive: '#6b7a2e', Yellow: '#eab308', Orange: '#ea580c', Brown: '#7c4a2d', Beige: '#d6c3a1',
  Gold: '#c9a227', Silver: '#c0c4cc', Teal: '#0f766e',
};
