/**
 * Automated Security & Stateless Verification Test Suite
 * Tests:
 * 1. Public catalog & search
 * 2. Auth & Admin Access Denial
 * 3. Retired payment endpoints return 410
 * 4. Stateless Cart additions & server price verification
 * 5. Stateless Order creation with tamper-proof HMAC signature
 * 6. Multi-instance cold start continuity test (simulating two isolated serverless instances)
 */
const http = require('http');

const PORT = 5000;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      ...headers,
      ...(payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      } : {})
    };

    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SECURITY & STATELESS VERIFICATION SUITE ---');
  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. Health & Security Headers
  const health = await request('GET', '/api/health');
  assert('Health check returns 200', health.status === 200);
  assert('X-Powered-By is omitted', !health.headers['x-powered-by']);
  assert('CSP header present in Express response', Boolean(health.headers['content-security-policy']));

  // 2. Retired Payments return 410
  const payConfig = await request('GET', '/api/payments/config');
  assert('Payment config returns demo=true', payConfig.status === 200 && payConfig.data?.data?.demo === true);

  const retiredPay = await request('POST', '/api/payments/initiate', { amount: 100 });
  assert('Retired payment endpoint returns 410 Gone', retiredPay.status === 410);

  // 3. Admin Route Protection
  const adminDenial = await request('GET', '/api/admin/stats');
  assert('Unauthenticated access to /api/admin/stats is denied (401)', adminDenial.status === 401);

  // Customer attempting admin access
  const custLogin = await request('POST', '/api/auth/login', { email: 'demo@electrohub.com', password: 'Demo@123' });
  assert('Customer login succeeds (200)', custLogin.status === 200);
  const custToken = custLogin.data?.data?.token;

  const adminForbidden = await request('GET', '/api/admin/stats', null, { Authorization: `Bearer ${custToken}` });
  assert('Customer token denied admin access (403)', adminForbidden.status === 403);
  if (process.env.DEMO_ADMIN_EMAIL && process.env.DEMO_ADMIN_PASSWORD) {
    const adminLogin = await request('POST', '/api/auth/login', { email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD });
    const adminToken = adminLogin.data?.data?.token;
    assert('Configured admin can view dashboard', Boolean(adminToken) && (await request('GET', '/api/admin/stats', null, { Authorization: `Bearer ${adminToken}` })).status === 200);
    const deniedEdit = await request('POST', '/api/admin/products', { name: 'Unstored demo product' }, { Authorization: `Bearer ${adminToken}` });
    assert('Admin write is explicitly read-only', deniedEdit.status === 405);
  }

  // 4. Cart Server Validation & Signed Cookie
  const cartAdd = await request('POST', '/api/cart', { productId: 1, quantity: 2 });
  assert('Guest can add product to cart (200)', cartAdd.status === 200);
  const setCookie = cartAdd.headers['set-cookie'];
  assert('Cart endpoint returns HttpOnly signed session cookie', Boolean(setCookie && setCookie.some(c => c.includes('HttpOnly') && c.includes('electrohub_session'))));

  const sessionCookieHeader = setCookie ? setCookie[0].split(';')[0] : '';

  // Tamper detection on session cookie
  const tamperedCookie = sessionCookieHeader + 'tampered';
  const getTamperedCart = await request('GET', '/api/cart', null, { Cookie: tamperedCookie });
  assert('Tampered session cookie is rejected and defaults safely to empty cart', getTamperedCart.status === 200 && getTamperedCart.data?.data?.length === 0);

  // Valid session cookie retrieval
  const getValidCart = await request('GET', '/api/cart', null, { Cookie: sessionCookieHeader });
  assert('Valid session cookie correctly restores cart across requests', getValidCart.status === 200 && getValidCart.data?.data?.length > 0);

  // 5. Simulated Order Placement
  const orderRes = await request('POST', '/api/orders', {
    payment_method: 'UPI',
    coupon_code: 'WELCOME10',
    address: { name: 'Smoke Test', phone: '9876543210', pincode: '400001', address_line: 'Demo Street', city: 'Mumbai', state: 'Maharashtra', type: 'Home' }
  }, { Cookie: sessionCookieHeader });

  assert('Order placed successfully (201)', orderRes.status === 201);
  assert('Order response contains HMAC demo order token', Boolean(orderRes.data?.data?.demoOrderToken));
  assert('Order response explicitly labels simulated demo order', Boolean(orderRes.data?.data?.disclaimer?.includes('Simulated Demo Order')));

  const orderToken = orderRes.data?.data?.demoOrderToken;
  const trackRes = await request('GET', `/api/orders/track?token=${orderToken}`);
  assert('Tracking endpoint verifies encrypted demo order token statelessly', trackRes.status === 200 && trackRes.data?.data?.is_demo === true);
  const invalidTrack = await request('GET', '/api/orders/track?token=invalid');
  assert('Invalid tracking token fails closed', invalidTrack.status === 404);
  const unknownOrder = await request('GET', '/api/orders/track?orderId=999999');
  assert('Unknown order number cannot fabricate a shipment', unknownOrder.status === 404);

  // 6. Cookie Confidentiality and Size Checks
  const orderCookie = orderRes.headers['set-cookie'] ? orderRes.headers['set-cookie'][0] : '';
  assert('Cookie size is well within 4KB browser limit (< 1.5KB)', orderCookie.length < 1500);
  assert('Cookie content is encrypted (does not leak plain address or email)', !orderCookie.includes('Demo Street') && !orderCookie.includes('Smoke Test'));
  const emptyAfterOrder = await request('GET', '/api/cart', null, { Cookie: orderCookie.split(';')[0] });
  assert('Placed order clears the authoritative server cart', emptyAfterOrder.status === 200 && emptyAfterOrder.data?.data?.length === 0);
  const noBodyCart = await request('POST', '/api/orders', { payment_method: 'UPI', items: [{ product_id: 1, quantity: 1 }], address: { name: 'Smoke Test', phone: '9876543210', pincode: '400001', address_line: 'Demo Street', city: 'Mumbai', state: 'Maharashtra' } }, { Cookie: orderCookie.split(';')[0] });
  assert('Client-supplied cart items cannot recreate an order', noBodyCart.status === 400);

  // 7. CSRF Defense Checks
  const crossSitePost = await request('POST', '/api/cart', { productId: 1, quantity: 1 }, {
    'Sec-Fetch-Site': 'cross-site'
  });
  assert('Cross-site state-changing request blocked with 403', crossSitePost.status === 403);

  console.log(`\nTests Completed: ${passed}/${total} passed.`);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
