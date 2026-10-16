const dataStore = require('../dataStore');
const { successResponse, errorResponse } = require('../utils/response');

const SYNONYMS = {
  mobile: 'phone', mobiles: 'phone', smartphone: 'phone', television: 'tv', tvs: 'tv', fridge: 'refrigerator',
  fridges: 'refrigerator', ac: 'air conditioner', acs: 'air conditioner', notebook: 'laptop', dslr: 'dslr',
  washer: 'washing', microwave: 'microwave', hoover: 'vacuum', powerbank: 'power bank', powerbanks: 'power bank',
  headphone: 'headphone', headset: 'headphone', earphones: 'headphone', tab: 'tablet', charger: 'charger', smartwatches: 'smartwatch',
};

const normalizeTerm = (raw) => {
  let term = String(raw || '').toLowerCase().replace(/-/g, '');
  if (SYNONYMS[term]) return SYNONYMS[term];
  if (term.length > 3 && term.endsWith('s')) term = term.slice(0, -1);
  return term;
};

const csv = (value) => String(value || '').split(',').map(v => v.trim()).filter(Boolean);

const specFilters = (q) => Object.entries(q)
  .filter(([k, v]) => k.startsWith('spec_') && v)
  .map(([k, v]) => [k.slice(5), csv(v)]);

const getSellingPrice = (p) => p.price * (100 - (p.discount_percent || 0)) / 100;

const cloneProduct = (p) => ({
  ...p,
  colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
  sizes: Array.isArray(p.sizes) ? p.sizes : JSON.parse(p.sizes || '[]'),
  images: Array.isArray(p.images) ? p.images : JSON.parse(p.images || '[]'),
  specs: typeof p.specs === 'object' && p.specs !== null ? p.specs : JSON.parse(p.specs || '{}'),
});

const filterProducts = (allProducts, q, skip = null) => {
  return allProducts.filter(p => {
    if (!q.includeArchived && !p.is_active) return false;

    if (q.search) {
      const terms = q.search.split(/\s+/).filter(Boolean).slice(0, 8).map(normalizeTerm);
      const searchTarget = [
        p.name, p.brand, p.category, p.subcategory,
        (p.colors || []).join(' '),
        Object.entries(p.specs || {}).map(([k, v]) => `${k} ${v}`).join(' '),
        p.description || ''
      ].join(' ').toLowerCase().replace(/-/g, '');

      const matchesAll = terms.every(term => searchTarget.includes(term));
      if (!matchesAll) return false;
    }

    if (q.category && p.category !== q.category) return false;
    if (q.gender && p.gender !== q.gender) return false;

    if (skip !== 'subcategory') {
      const subs = csv(q.subcategory);
      if (subs.length && !subs.includes(p.subcategory)) return false;
    }

    if (skip !== 'brand') {
      const brands = csv(q.brand);
      if (brands.length && !brands.includes(p.brand)) return false;
    }

    if (skip !== 'color') {
      const colors = csv(q.color);
      if (colors.length && !(p.colors || []).some(c => colors.includes(c))) return false;
    }

    if (skip !== 'size') {
      const sizes = csv(q.size);
      if (sizes.length && !(p.sizes || []).some(s => sizes.includes(s))) return false;
    }

    const sell = getSellingPrice(p);
    if (skip !== 'price') {
      if (q.minPrice && sell < Number(q.minPrice)) return false;
      if (q.maxPrice && sell > Number(q.maxPrice)) return false;
    }

    if (q.minRating && (p.rating || 0) < Number(q.minRating)) return false;
    if (q.discount && (p.discount_percent || 0) < Number(q.discount)) return false;

    for (const [key, values] of specFilters(q)) {
      if (skip === `spec_${key}`) continue;
      const specVal = p.specs ? p.specs[key] : null;
      if (!specVal || !values.includes(specVal)) return false;
    }

    return true;
  });
};

const countBy = (items, key) => {
  const counts = {};
  items.forEach(p => {
    const val = p[key];
    if (Array.isArray(val)) {
      val.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    } else if (val) {
      counts[val] = (counts[val] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

exports.getProducts = (req, res) => {
  try {
    const all = dataStore.getProducts().map(cloneProduct);
    const q = req.query;
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 24));

    const filtered = filterProducts(all, q);
    const total = filtered.length;

    // Sorting
    const sort = q.sort || 'popularity';
    const sorted = [...filtered].sort((a, b) => {
      if (q.boostColor) {
        const aHas = (a.colors || []).includes(q.boostColor);
        const bHas = (b.colors || []).includes(q.boostColor);
        if (aHas !== bHas) return bHas ? 1 : -1;
      }
      if (sort === 'newest') return new Date(b.created_at) - new Date(a.created_at) || b.id - a.id;
      if (sort === 'rating') return (b.rating - a.rating) || (b.rating_count - a.rating_count);
      if (sort === 'discount') return (b.discount_percent - a.discount_percent) || (b.rating - a.rating);
      if (sort === 'price_asc') return getSellingPrice(a) - getSellingPrice(b);
      if (sort === 'price_desc') return getSellingPrice(b) - getSellingPrice(a);
      // default: popularity
      return (b.rating_count - a.rating_count) || (b.rating - a.rating);
    });

    const products = sorted.slice((page - 1) * limit, page * limit);

    // Facets computation
    const facetPool = (skipKey) => filterProducts(all, q, skipKey);

    const priceRows = facetPool('price').map(getSellingPrice);
    const minPrice = priceRows.length ? Math.floor(Math.min(...priceRows)) : 0;
    const maxPrice = priceRows.length ? Math.ceil(Math.max(...priceRows)) : 0;

    // Specifications facets
    const specFacets = {};
    const specPool = facetPool(null);
    const specKeys = new Set();
    specPool.forEach(p => {
      if (p.specs) Object.keys(p.specs).forEach(k => specKeys.add(k));
    });

    for (const key of specKeys) {
      const counts = {};
      facetPool(`spec_${key}`).forEach(p => {
        const val = p.specs ? p.specs[key] : null;
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      const values = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0) || a.value.localeCompare(b.value));
      if (values.length >= 2 && values.length <= 14) {
        specFacets[key] = values;
      }
    }

    return successResponse(res, 200, {
      products,
      pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
      facets: {
        subcategories: countBy(facetPool('subcategory'), 'subcategory'),
        brands: countBy(facetPool('brand'), 'brand'),
        colors: countBy(facetPool('color'), 'colors'),
        sizes: countBy(facetPool('size'), 'sizes'),
        specs: specFacets,
        price: { min: minPrice, max: maxPrice }
      }
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getCategories = (req, res) => {
  try {
    const all = dataStore.getProducts().filter(p => p.is_active).map(cloneProduct);
    const tree = {};

    all.forEach(p => {
      if (!tree[p.category]) {
        tree[p.category] = { name: p.category, count: 0, subcategories: [] };
      }
      tree[p.category].count += 1;

      let sub = tree[p.category].subcategories.find(s => s.name === p.subcategory);
      if (!sub) {
        sub = {
          name: p.subcategory,
          count: 0,
          maxDiscount: p.discount_percent || 0,
          image: p.images?.[0] || null
        };
        tree[p.category].subcategories.push(sub);
      }
      sub.count += 1;
      if (p.discount_percent > sub.maxDiscount) sub.maxDiscount = p.discount_percent;
    });

    return successResponse(res, 200, Object.values(tree));
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getProductById = (req, res) => {
  try {
    const product = dataStore.getProductById(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const cloned = cloneProduct(product);
    const reviews = dataStore.getReviewsForProduct(product.id).slice(0, 10);

    const allReviews = dataStore.getReviewsForProduct(product.id);
    const total_reviews = allReviews.length;
    const avg_rating = total_reviews > 0
      ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews).toFixed(1))
      : 0;

    const ratingSummary = {
      avg_rating,
      total_reviews,
      star_5: allReviews.filter(r => r.rating === 5).length,
      star_4: allReviews.filter(r => r.rating === 4).length,
      star_3: allReviews.filter(r => r.rating === 3).length,
      star_2: allReviews.filter(r => r.rating === 2).length,
      star_1: allReviews.filter(r => r.rating === 1).length,
    };

    return successResponse(res, 200, { product: cloned, reviews, ratingSummary });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getRelatedProducts = (req, res) => {
  try {
    const product = dataStore.getProductById(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');

    const all = dataStore.getProducts().filter(p => p.is_active && p.id !== product.id && p.category === product.category).map(cloneProduct);
    const related = all.sort((a, b) => {
      const aSub = a.subcategory === product.subcategory ? 1 : 0;
      const bSub = b.subcategory === product.subcategory ? 1 : 0;
      return (bSub - aSub) || (b.rating - a.rating) || (b.rating_count - a.rating_count);
    }).slice(0, 12);

    return successResponse(res, 200, related);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getProductsByIds = (req, res) => {
  try {
    const ids = csv(req.query.ids).map(Number).filter(Number.isInteger).slice(0, 30);
    if (!ids.length) return successResponse(res, 200, []);
    const items = ids.map(id => dataStore.getProductById(id)).filter(p => p && p.is_active).map(cloneProduct);
    return successResponse(res, 200, items);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getSuggestions = (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return successResponse(res, 200, { products: [], categories: [], brands: [] });

    const all = dataStore.getProducts().filter(p => p.is_active).map(cloneProduct);
    const filtered = filterProducts(all, { search: q });

    const products = filtered
      .sort((a, b) => b.rating_count - a.rating_count)
      .slice(0, 6)
      .map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        price: p.price,
        discount_percent: p.discount_percent,
        image: p.images?.[0] || null
      }));

    const term = normalizeTerm(q);
    const catCounts = {};
    all.forEach(p => {
      const subNorm = normalizeTerm(p.subcategory);
      const catNorm = p.category.toLowerCase();
      if (subNorm.includes(term) || catNorm.includes(term)) {
        const key = `${p.category}|||${p.subcategory}`;
        catCounts[key] = (catCounts[key] || 0) + 1;
      }
    });

    const categories = Object.entries(catCounts)
      .map(([k, count]) => {
        const [category, subcategory] = k.split('|||');
        return { category, subcategory, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const brandCounts = {};
    all.forEach(p => {
      if (p.brand.toLowerCase().includes(q.toLowerCase())) {
        brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      }
    });

    const brands = Object.entries(brandCounts)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return successResponse(res, 200, { products, categories, brands });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

const curatedList = (sortFn) => (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12));
    let items = dataStore.getProducts().filter(p => p.is_active).map(cloneProduct);
    if (req.query.category) {
      items = items.filter(p => p.category === req.query.category);
    }
    items.sort(sortFn);
    return successResponse(res, 200, items.slice(0, limit));
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getTrending = curatedList((a, b) => (b.rating_count - a.rating_count) || (b.rating - a.rating));
exports.getNewArrivals = curatedList((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
exports.getDeals = curatedList((a, b) => (b.discount_percent - a.discount_percent) || (b.rating - a.rating));
exports.getTopRated = curatedList((a, b) => (b.rating - a.rating) || (b.rating_count - a.rating_count));
