// Small per-browser conveniences (recently viewed, recent searches). Storage can be
// unavailable (private mode, blocked site data), so every access is guarded.

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const pushUnique = (key, value, max) => {
  const list = read(key, []).filter(v => v !== value);
  list.unshift(value);
  write(key, list.slice(0, max));
};

export const getRecentlyViewed = () => read('recentlyViewed', []);
export const addRecentlyViewed = (productId) => pushUnique('recentlyViewed', productId, 20);

export const getRecentSearches = () => read('recentSearches', []);
export const addRecentSearch = (term) => {
  const clean = String(term || '').trim();
  if (clean) pushUnique('recentSearches', clean, 8);
};
export const clearRecentSearches = () => write('recentSearches', []);

// The visual-search photo is kept only for this tab session so the results page can show it
export const setVisualSearchImage = (dataUrl) => {
  try {
    sessionStorage.setItem('visualSearchImage', dataUrl);
  } catch {
    // Image too large for storage; results still work without the preview
  }
};
export const getVisualSearchImage = () => {
  try {
    return sessionStorage.getItem('visualSearchImage');
  } catch {
    return null;
  }
};
