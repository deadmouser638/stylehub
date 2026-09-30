const API = 'http://localhost:5000/api';
let token = '';

async function testAuth() {
  console.log('--- Testing Auth ---');
  
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@stylehub.com', password: 'Demo@123' })
    });
    const data = await res.json();
    console.log('Login: ', data.success);
    token = data.data.token;
  } catch (err) {
    console.log('Login failed', err);
  }

  try {
    const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    console.log('Get Me: ', data.success);
  } catch (err) {
    console.log('Get Me failed', err);
  }
}

async function testProducts() {
  console.log('--- Testing Products ---');
  try {
    let res = await fetch(`${API}/products?limit=2`);
    let data = await res.json();
    console.log('Get Products: ', data.success, data.data.products.length, 'items');
    
    res = await fetch(`${API}/products/1`);
    data = await res.json();
    console.log('Get Product By ID: ', data.success, data.data.product.name);

    res = await fetch(`${API}/products/trending`);
    data = await res.json();
    console.log('Get Trending: ', data.success, data.data.length, 'items');
  } catch (err) {
    console.log('Products failed', err);
  }
}

async function testCart() {
  console.log('--- Testing Cart ---');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  
  try {
    let res = await fetch(`${API}/cart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: 1, size: 'M', quantity: 2 })
    });
    let data = await res.json();
    console.log('Add to cart: ', data.success);

    res = await fetch(`${API}/cart`, { headers });
    data = await res.json();
    console.log('Get cart: ', data.success, data.data.length, 'items');
  } catch (err) {
    console.log('Cart failed', err);
  }
}

async function runTests() {
  await testAuth();
  await testProducts();
  await testCart();
  console.log('Testing completed.');
}

runTests();
