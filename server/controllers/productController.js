const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');

// Price the customer actually pays, after the product discount
const SELLING_PRICE = '(price * (100 - discount_percent) / 100)';

// Fields a search term is matched against. Hyphens are stripped so "tshirt" finds "T-Shirt".
const SEARCH_FIELDS = ['name', 'brand', 'category', 'subcategory', 'colors', 'specs', 'description']
  .map(f => `REPLACE(LOWER(${f}), '-', '')`);

const SYNONYMS = {
  mobile: 'phone', mobiles: 'phone', smartphone: 'phone', television: 'tv', tvs: 'tv', fridge: 'refrigerator',
  fridges: 'refrigerator', ac: 'air conditioner', acs: 'air conditioner', notebook: 'laptop', dslr: 'dslr',
  washer: 'washing', microwave: 'microwave', hoover: 'vacuum', powerbank: 'power bank', powerbanks: 'power bank',
  headphone: 'headphone', headset: 'headphone', earphones: 'headphone', tab: 'tablet', charger: 'charger', smartwatches: 'smartwatch',
};

const normalizeTerm = (raw) => {
  let term = raw.toLowerCase().replace(/-/g, '');
  if (SYNONYMS[term]) return SYNONYMS[term];
  // Crude singularisation so "watches", "shoes" and "jeans" still match their singular forms
  if (term.length > 3 && term.endsWith('s')) term = term.slice(0, -1);
  return term;
};

const parseProduct = (p) => {
  p.colors = JSON.parse(p.colors || '[]');
  p.sizes = JSON.parse(p.sizes || '[]');
  p.images = JSON.parse(p.images || '[]');
  p.specs = JSON.parse(p.specs || '{}');
  return p;
};

// Specification filters arrive as spec_<Key>=value1,value2 (e.g. spec_RAM=8 GB,16 GB)
const SPEC_KEY = /^[\w .&()/-]{1,40}$/;
const specFilters = (q) => Object.entries(q)
  .filter(([k, v]) => k.startsWith('spec_') && v && SPEC_KEY.test(k.slice(5)))
  .map(([k, v]) => [k.slice(5), csv(v)]);

const csv = (value) => String(value || '').split(',').map(v => v.trim()).filter(Boolean);

// Builds the WHERE clause for the listing filters. `skip` leaves one filter out so a facet
// can show the counts the user would get by changing that filter.
const buildFilters = (q, skip = null) => {
  // Archived products are hidden from the shop (admins can still see them)
  const where = [q.includeArchived ? '1=1' : 'is_active = 1'];
  const params = [];

  if (q.search) {
    const terms = q.search.split(/\s+/).filter(Boolean).slice(0, 8).map(normalizeTerm);
    for (const term of terms) {
      where.push(`(${SEARCH_FIELDS.map(f => `${f} LIKE ?`).join(' OR ')})`);
      params.push(...SEARCH_FIELDS.map(() => `%${term}%`));
    }
  }
  if (q.category) { where.push('category = ?'); params.push(q.category); }
  if (q.gender) { where.push('gender = ?'); params.push(q.gender); }

  const multi = (key, column, jsonArray) => {
    if (skip === key) return;
    const values = csv(q[key]);
    if (!values.length) return;
    if (jsonArray) {
      where.push(`(${values.map(() => `${column} LIKE ?`).join(' OR ')})`);
      params.push(...values.map(v => `%"${v}"%`));
    } else {
      where.push(`${column} IN (${values.map(() => '?').join(',')})`);
      params.push(...values);
    }
  };
  multi('subcategory', 'subcategory');
  multi('brand', 'brand');
  multi('color', 'colors', true);
  multi('size', 'sizes', true);

  if (skip !== 'price') {
    if (q.minPrice) { where.push(`${SELLING_PRICE} >= ?`); params.push(Number(q.minPrice)); }
    if (q.maxPrice) { where.push(`${SELLING_PRICE} <= ?`); params.push(Number(q.maxPrice)); }
  }
  for (const [key, values] of specFilters(q)) {
    if (skip === `spec_${key}`) continue;
    where.push(`json_extract(specs, ?) IN (${values.map(() => '?').join(',')})`);
    params.push(`$."${key}"`, ...values);
  }
  if (q.minRating) { where.push('rating >= ?'); params.push(Number(q.minRating)); }
  if (q.discount) { where.push('discount_percent >= ?'); params.push(Number(q.discount)); }

  return { where: where.join(' AND '), params };
};

const countBy = (rows, column) => {
  const counts = {};
  rows.forEach(r => {
    const values = column === 'colors' || column === 'sizes' ? JSON.parse(r[column] || '[]') : [r[column]];
    values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  });
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

exports.getProducts = (req, res) => {
  try {
    const q = req.query;
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 24));

    const { where, params } = buildFilters(q);
    const total = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE ${where}`).get(...params).count;

    const orderParts = [];
    // Visual search: show products whose colour matches the photo first
    if (q.boostColor) {
      orderParts.push('(colors LIKE ?) DESC');
      params.push(`%"${q.boostColor}"%`);
    }
    switch (q.sort) {
      case 'price_asc': orderParts.push(`${SELLING_PRICE} ASC`); break;
      case 'price_desc': orderParts.push(`${SELLING_PRICE} DESC`); break;
      case 'newest': orderParts.push('created_at DESC'); break;
      case 'rating': orderParts.push('rating DESC'); break;
      case 'discount': orderParts.push('discount_percent DESC'); break;
      default: orderParts.push('rating_count DESC');
    }
    orderParts.push('id ASC');

    const products = db.prepare(`
      SELECT * FROM products WHERE ${where}
      ORDER BY ${orderParts.join(', ')}
      LIMIT ? OFFSET ?
    `).all(...params, limit, (page - 1) * limit).map(parseProduct);

    // Facets: each one ignores its own filter so the user can see alternatives
    const facetRows = (skip) => {
      const f = buildFilters(q, skip);
      return db.prepare(`SELECT subcategory, brand, colors, sizes, ${SELLING_PRICE} AS sell FROM products WHERE ${f.where}`).all(...f.params);
    };
    const priceRows = facetRows('price');

    // Specification facets for the current listing (only keys with a useful number of choices)
    const specFacets = {};
    const specRows = db.prepare(`SELECT specs FROM products WHERE ${where}`).all(...params.slice(0, params.length - (q.boostColor ? 1 : 0)));
    const keys = new Set(specRows.flatMap(r => Object.keys(JSON.parse(r.specs || '{}'))));
    for (const key of keys) {
      if (['Warranty', 'Model'].includes(key)) continue;
      const f = buildFilters(q, `spec_${key}`);
      const counts = {};
      db.prepare(`SELECT json_extract(specs, ?) AS v FROM products WHERE ${f.where}`).all(`$."${key}"`, ...f.params)
        .forEach(({ v }) => { if (v) counts[v] = (counts[v] || 0) + 1; });
      const values = Object.entries(counts).map(([value, count]) => ({ value, count }))
        .sort((a, b) => (parseFloat(a.value) || 0) - (parseFloat(b.value) || 0) || a.value.localeCompare(b.value));
      if (values.length >= 2 && values.length <= 14) specFacets[key] = values;
    }

    return successResponse(res, 200, {
      products,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      facets: {
        subcategories: countBy(facetRows('subcategory'), 'subcategory'),
        brands: countBy(facetRows('brand'), 'brand'),
        colors: countBy(facetRows('color'), 'colors'),
        sizes: countBy(facetRows('size'), 'sizes'),
        specs: specFacets,
        price: priceRows.length
          ? { min: Math.floor(Math.min(...priceRows.map(r => r.sell))), max: Math.ceil(Math.max(...priceRows.map(r => r.sell))) }
          : { min: 0, max: 0 },
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getCategories = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT category, subcategory, COUNT(*) AS count, MAX(discount_percent) AS max_discount,
             (SELECT images FROM products p2 WHERE p2.category = p.category AND p2.subcategory = p.subcategory AND p2.is_active = 1
              ORDER BY rating_count DESC LIMIT 1) AS images
      FROM products p
      WHERE is_active = 1
      GROUP BY category, subcategory
      ORDER BY category, count DESC
    `).all();

    const tree = {};
    rows.forEach(r => {
      tree[r.category] ||= { name: r.category, count: 0, subcategories: [] };
      tree[r.category].count += r.count;
      tree[r.category].subcategories.push({
        name: r.subcategory,
        count: r.count,
        maxDiscount: Math.round(r.max_discount),
        image: JSON.parse(r.images || '[]')[0] || null,
      });
    });
    return successResponse(res, 200, Object.values(tree));
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getProductById = (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');
    parseProduct(product);

    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC LIMIT 10
    `).all(req.params.id);

    const ratingSummary = db.prepare(`
      SELECT
        AVG(rating) as avg_rating,
        COUNT(id) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as star_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as star_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as star_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as star_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as star_1
      FROM reviews WHERE product_id = ?
    `).get(req.params.id);

    return successResponse(res, 200, { product, reviews, ratingSummary });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getRelatedProducts = (req, res) => {
  try {
    const product = db.prepare('SELECT category, subcategory FROM products WHERE id = ?').get(req.params.id);
    if (!product) return errorResponse(res, 404, 'Product not found');

    // Same subcategory first, then the rest of the category
    const related = db.prepare(`
      SELECT * FROM products WHERE category = ? AND id != ? AND is_active = 1
      ORDER BY (subcategory = ?) DESC, rating DESC LIMIT 12
    `).all(product.category, req.params.id, product.subcategory).map(parseProduct);

    return successResponse(res, 200, related);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getProductsByIds = (req, res) => {
  try {
    const ids = csv(req.query.ids).map(Number).filter(Number.isInteger).slice(0, 30);
    if (!ids.length) return successResponse(res, 200, []);
    const rows = db.prepare(`SELECT * FROM products WHERE is_active = 1 AND id IN (${ids.map(() => '?').join(',')})`).all(...ids).map(parseProduct);
    // Keep the order the ids were given in (e.g. most recently viewed first)
    const byId = new Map(rows.map(r => [r.id, r]));
    return successResponse(res, 200, ids.map(id => byId.get(id)).filter(Boolean));
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getSuggestions = (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return successResponse(res, 200, { products: [], categories: [], brands: [] });

    const { where, params } = buildFilters({ search: q });
    const products = db.prepare(`
      SELECT id, name, brand, category, subcategory, price, discount_percent, images, specs
      FROM products WHERE ${where} ORDER BY rating_count DESC LIMIT 6
    `).all(...params).map(p => ({ ...p, image: JSON.parse(p.images || '[]')[0] || null, images: undefined, specs: undefined }));

    const like = `%${normalizeTerm(q)}%`;
    const categories = db.prepare(`
      SELECT category, subcategory, COUNT(*) AS count FROM products
      WHERE is_active = 1 AND (REPLACE(LOWER(subcategory), '-', '') LIKE ? OR LOWER(category) LIKE ?)
      GROUP BY category, subcategory ORDER BY count DESC LIMIT 5
    `).all(like, like);

    const brands = db.prepare(`
      SELECT brand, COUNT(*) AS count FROM products WHERE is_active = 1 AND LOWER(brand) LIKE ?
      GROUP BY brand ORDER BY count DESC LIMIT 4
    `).all(`%${q.toLowerCase()}%`);

    return successResponse(res, 200, { products, categories, brands });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Server error');
  }
};

const listQuery = (orderBy) => (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const params = [];
    let where = 'is_active = 1';
    if (req.query.category) { where += ' AND category = ?'; params.push(req.query.category); }
    const rows = db.prepare(`SELECT * FROM products WHERE ${where} ORDER BY ${orderBy} LIMIT ?`).all(...params, limit).map(parseProduct);
    return successResponse(res, 200, rows);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getTrending = listQuery('rating_count DESC, rating DESC');
exports.getNewArrivals = listQuery('created_at DESC, id DESC');
exports.getDeals = listQuery('discount_percent DESC, rating DESC');
exports.getTopRated = listQuery('rating DESC, rating_count DESC');
