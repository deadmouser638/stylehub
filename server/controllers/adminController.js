const dataStore = require('../dataStore');
const { successResponse, errorResponse } = require('../utils/response');

const num = (value, fallback = 0) => (value === '' || value === undefined || value === null || Number.isNaN(Number(value)) ? fallback : Number(value));
const list = (value) => (Array.isArray(value) ? value : String(value || '').split(/[,\n]/)).map(v => String(v).trim()).filter(Boolean);

const parseSpecs = (value) => {
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [String(k).trim(), String(v).trim()]).filter(([k, v]) => k && v));
  const specs = {};
  String(value || '').split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i > 0) { const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim(); if (k && v) specs[k] = v; }
  });
  return specs;
};

// ---------- Dashboard ----------
exports.getStats = (req, res) => {
  try {
    const products = dataStore.getProducts();
    const active = products.filter(p => p.is_active);
    const archived = products.filter(p => !p.is_active);
    const lowStock = active.filter(p => (p.stock || 0) <= 5);

    const byCat = {};
    active.forEach(p => {
      byCat[p.category] = (byCat[p.category] || { category: p.category, count: 0, stock: 0 });
      byCat[p.category].count += 1;
      byCat[p.category].stock += (p.stock || 0);
    });

    return successResponse(res, 200, {
      products: active.length,
      archived: archived.length,
      lowStock: lowStock.length,
      orders: 24,
      pendingOrders: 3,
      paymentsToVerify: 0,
      revenue: 428950,
      customers: 18,
      byCategory: Object.values(byCat),
      recentOrders: [
        { id: 982141, total_amount: 54999, status: 'Shipped', payment_method: 'Demo UPI', customer: 'Aarav Mehta', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 982140, total_amount: 1499, status: 'Delivered', payment_method: 'Demo COD', customer: 'Priya Sharma', created_at: new Date(Date.now() - 7200000).toISOString() }
      ],
      lowStockProducts: lowStock.slice(0, 8),
      disclaimer: 'Admin Demo Mode: Edits are held in serverless instance memory and will not persist across deployments or cold restarts.'
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

// ---------- Products ----------
exports.getProductCategories = (req, res) => {
  const products = dataStore.getProducts().filter(p => p.is_active);
  const tree = {};
  products.forEach(p => {
    (tree[p.category] ||= { name: p.category, count: 0, subcategories: [] });
    let sub = tree[p.category].subcategories.find(s => s.name === p.subcategory);
    if (!sub) {
      sub = { name: p.subcategory, count: 0 };
      tree[p.category].subcategories.push(sub);
    }
    sub.count += 1;
    tree[p.category].count += 1;
  });
  return successResponse(res, 200, Object.values(tree));
};

exports.listProducts = (req, res) => {
  try {
    const { search, category, subcategory, status = 'active', sort = 'newest' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    let products = dataStore.getProducts();

    if (status === 'active') products = products.filter(p => p.is_active);
    else if (status === 'archived') products = products.filter(p => !p.is_active);
    else if (status === 'out') products = products.filter(p => p.is_active && (p.stock || 0) === 0);
    else if (status === 'low') products = products.filter(p => p.is_active && (p.stock || 0) <= 5);

    if (category) products = products.filter(p => p.category === category);
    if (subcategory) products = products.filter(p => p.subcategory === subcategory);
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s) || String(p.id) === search.trim());
    }

    if (sort === 'newest') products.sort((a, b) => b.id - a.id);
    else if (sort === 'oldest') products.sort((a, b) => a.id - b.id);
    else if (sort === 'price_asc') products.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') products.sort((a, b) => b.price - a.price);
    else if (sort === 'stock_asc') products.sort((a, b) => a.stock - b.stock);
    else if (sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name));

    const total = products.length;
    const paginated = products.slice((page - 1) * limit, page * limit);

    return successResponse(res, 200, {
      products: paginated,
      pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.getProduct = (req, res) => {
  const p = dataStore.getProductById(req.params.id);
  if (!p) return errorResponse(res, 404, 'Product not found');
  return successResponse(res, 200, p);
};

exports.createProduct = (req, res) => {
  try {
    const data = {
      name: String(req.body.name || '').trim(),
      brand: String(req.body.brand || '').trim(),
      description: String(req.body.description || '').trim(),
      category: String(req.body.category || '').trim(),
      subcategory: String(req.body.subcategory || '').trim(),
      gender: String(req.body.gender || 'Unisex').trim(),
      price: num(req.body.price, 999),
      discount_percent: num(req.body.discount_percent, 0),
      stock: Math.round(num(req.body.stock, 10)),
      colors: list(req.body.colors),
      sizes: list(req.body.sizes),
      images: list(req.body.images),
      specs: parseSpecs(req.body.specs),
      is_active: req.body.is_active === false ? 0 : 1
    };

    if (!data.name || !data.brand || !data.category || !data.subcategory) {
      return errorResponse(res, 400, 'Name, brand, category and subcategory are required');
    }

    const created = dataStore.saveProduct(data);
    return successResponse(res, 201, created, 'Product created in demo session (ephemeral)');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.updateProduct = (req, res) => {
  try {
    const existing = dataStore.getProductById(req.params.id);
    if (!existing) return errorResponse(res, 404, 'Product not found');

    const updated = dataStore.saveProduct({
      ...existing,
      ...req.body,
      id: Number(req.params.id),
      colors: req.body.colors ? list(req.body.colors) : existing.colors,
      sizes: req.body.sizes ? list(req.body.sizes) : existing.sizes,
      images: req.body.images ? list(req.body.images) : existing.images,
      specs: req.body.specs ? parseSpecs(req.body.specs) : existing.specs
    });

    return successResponse(res, 200, updated, 'Product updated (ephemeral demo)');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

exports.deleteProduct = (req, res) => {
  dataStore.deleteProduct(req.params.id);
  return successResponse(res, 200, null, 'Product removed from demo memory');
};

// ---------- Inventory ----------
exports.getInventorySummary = (req, res) => {
  const products = dataStore.getProducts().filter(p => p.is_active);
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStock = products.filter(p => (p.stock || 0) <= 5).length;
  const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
  return successResponse(res, 200, { totalStock, lowStock, outOfStock, totalProducts: products.length });
};

exports.listMovements = (req, res) => {
  return successResponse(res, 200, [
    { id: 1, product_id: 1, change: 10, stock_after: 77, reason: 'Initial seed', reference: 'Opening balance', created_at: new Date().toISOString() }
  ]);
};

exports.adjustInventory = (req, res) => {
  const { delta } = req.body;
  const newStock = dataStore.updateProductStock(req.params.id, Number(delta || 0));
  return successResponse(res, 200, { stock: newStock }, 'Stock adjusted in demo memory');
};

exports.setInventoryStock = (req, res) => {
  const { stock } = req.body;
  const newStock = dataStore.setProductStock(req.params.id, stock);
  return successResponse(res, 200, { stock: newStock }, 'Stock set in demo memory');
};

// ---------- Coupons & Offers ----------
exports.listCoupons = (req, res) => successResponse(res, 200, dataStore.getCoupons());
exports.createCoupon = (req, res) => successResponse(res, 201, req.body, 'Coupon created (ephemeral demo)');
exports.updateCoupon = (req, res) => successResponse(res, 200, req.body, 'Coupon updated');
exports.deleteCoupon = (req, res) => successResponse(res, 200, null, 'Coupon deleted');

exports.listOffers = (req, res) => successResponse(res, 200, dataStore.getOffers());
exports.createOffer = (req, res) => successResponse(res, 201, req.body, 'Offer created (ephemeral demo)');
exports.updateOffer = (req, res) => successResponse(res, 200, req.body, 'Offer updated');
exports.deleteOffer = (req, res) => successResponse(res, 200, null, 'Offer deleted');

// ---------- Orders ----------
exports.listOrders = (req, res) => {
  return successResponse(res, 200, [
    { id: 982141, total_amount: 54999, status: 'Shipped', payment_status: 'Paid', payment_method: 'Demo UPI', customer: 'Aarav Mehta', courier: 'BlueDart Express', tracking_number: 'BD-DEMO-982141', created_at: new Date().toISOString() }
  ]);
};
exports.updateOrder = (req, res) => successResponse(res, 200, req.body, 'Order updated in demo session');
exports.deleteOrder = (req, res) => successResponse(res, 200, null, 'Order removed');
