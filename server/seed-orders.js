const db = require('./db');

try {
  console.log('Seeding initial demo orders into database.sqlite...');

  // Ensure tables exist
  const count = db.prepare('SELECT COUNT(*) as n FROM orders').get().n;
  console.log('Current orders count:', count);

  if (count === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, user_id, total_amount, discount_amount, payment_method, status, payment_status, payment_ref, coupon_code, delivery_fee, courier, tracking_number, address_snapshot, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))
    `);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, name, price, size, quantity, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertHistory = db.prepare(`
      INSERT INTO inventory_movements (product_id, change, stock_after, reason, reference, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    const addr1 = JSON.stringify({
      id: 1,
      name: 'Demo User',
      phone: '9876543210',
      pincode: '400001',
      address_line: 'Flat 402, Sunshine Towers, Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      type: 'Home'
    });

    const addr2 = JSON.stringify({
      id: 2,
      name: 'Aarav Mehta',
      phone: '9812345678',
      pincode: '560001',
      address_line: '12B, Green Park Residency, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      type: 'Office'
    });

    const addr3 = JSON.stringify({
      id: 3,
      name: 'Priya Sharma',
      phone: '9988776655',
      pincode: '110001',
      address_line: 'House 84, Sector 14, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      type: 'Home'
    });

    db.transaction(() => {
      // Order 1: Pending (UPI)
      insertOrder.run(
        1001, 1, 52599, 0, 'UPI', 'Pending', 'Verifying', 'UPI983421098432', null, 0, null, null, addr1, '-1 hour', '-1 hour'
      );
      insertItem.run(
        1001, 1, 'Samsung Galaxy S23 FE (Black, 8 GB RAM, 128 GB)', 52599, 'Default', 1,
        'https://images.unsplash.com/photo-1592890288564-76628a30a657?w=800&q=80&auto=format&fit=crop'
      );

      // Order 2: Confirmed (COD)
      insertOrder.run(
        1002, 1, 108599, 1000, 'COD', 'Confirmed', 'Pay on Delivery', null, 'FLAT1000', 0, null, null, addr1, '-5 hours', '-4 hours'
      );
      insertItem.run(
        1002, 3, 'Google Pixel 8 (Grey, 8 GB RAM, 128 GB)', 108599, 'Default', 1,
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80&auto=format&fit=crop'
      );

      // Order 3: Packed (Card)
      insertOrder.run(
        1003, 3, 242699, 0, 'Card', 'Packed', 'Paid', 'pay_Nsd98234j2k34', null, 0, 'Blue Dart', null, addr2, '-1 day', '-18 hours'
      );
      insertItem.run(
        1003, 4, 'Apple iPhone 15 Pro Max (Black, 256 GB)', 242699, 'Default', 1,
        'https://images.unsplash.com/photo-1634403665481-74948d815f03?w=800&q=80&auto=format&fit=crop'
      );

      // Order 4: Shipped (Card)
      insertOrder.run(
        1004, 4, 171799, 5000, 'Card', 'Shipped', 'Paid', 'pay_Plq9982348123', 'MEGA5000', 0, 'Delhivery', 'DLV9928340192', addr3, '-2 days', '-1 day'
      );
      insertItem.run(
        1004, 2, 'Samsung Galaxy S24 Ultra (White, 12 GB RAM, 512 GB)', 171799, 'Default', 1,
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80&auto=format&fit=crop'
      );

      // Order 5: Delivered (Card)
      insertOrder.run(
        1005, 1, 253699, 0, 'Card', 'Delivered', 'Paid', 'pay_Okj2389148723', null, 0, 'Blue Dart', 'BD776251420IN', addr1, '-4 days', '-2 days'
      );
      insertItem.run(
        1005, 5, 'Apple iPhone 15 Pro (Silver, 512 GB)', 253699, 'Default', 1,
        'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800&q=80&auto=format&fit=crop'
      );
    })();

    console.log('Seeded 5 demo orders with various statuses!');
  } else {
    console.log('Orders table already has data, skipping seed.');
  }
} catch (e) {
  console.error('Error seeding orders:', e);
}
