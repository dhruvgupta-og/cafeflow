/**
 * CafeFlow Emulator Seed Script
 *
 * Seeds the Firebase Auth + Firestore emulators with:
 *   - 1 platform admin account
 *   - 2 cafes, each with an owner account
 *   - 3 menu categories × 3-4 items per cafe
 *   - 4 tables per cafe
 *   - A spread of sample orders across different statuses
 *
 * Prerequisites:
 *   npm run emulators   (starts Firebase Emulator Suite)
 *   npm run seed:emulator
 *
 * Environment:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080
 *   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
 */

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize admin SDK pointing at emulators
// In emulator mode, the credential doesn't need to be real
if (!getApps().length) {
  initializeApp({ projectId: 'cafeflow-872b9' });
}

const adminAuth = getAuth();
const db = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Create or get a Firebase Auth user in the emulator
// ─────────────────────────────────────────────────────────────────────────────
async function upsertUser(
  email: string,
  password: string,
  displayName: string
): Promise<string> {
  try {
    const user = await adminAuth.getUserByEmail(email);
    return user.uid;
  } catch {
    const user = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
    return user.uid;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
const cafes = [
  {
    id: 'cafe-velvet-roast',
    name: 'Velvet Roast & Bakery',
    address: '442 Market Street, Downtown Arts District',
    ownerEmail: 'elena@velvetroast.com',
    ownerName: 'Elena Rostova',
    phone: '+1 (555) 234-5678',
    logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80',
    plan: 'Pro',
    settings: {
      taxPercent: 8.5,
      serviceChargePercent: 5.0,
      currency: '₹',
      openingHours: '7:00 AM - 9:00 PM',
    },
    tables: [
      { id: 'T1', label: 'Table 1 (Window)', status: 'occupied' },
      { id: 'T2', label: 'Table 2 (Window)', status: 'free' },
      { id: 'T3', label: 'Table 3 (Patio Booth)', status: 'free' },
      { id: 'T4', label: 'Table 4 (Bar High-Top)', status: 'occupied' },
    ],
    categories: [
      {
        id: 'cat-coffee',
        name: 'Artisan Coffee & Espresso',
        sortOrder: 1,
        items: [
          { id: 'item-flat-white', name: 'Velvet Flat White', description: 'Double ristretto with micro-foamed organic whole milk.', price: 4.75, isVeg: true, isAvailable: true, addOns: [{ name: 'Oat Milk', price: 0.75 }, { name: 'Extra Shot', price: 1.50 }] },
          { id: 'item-iced-latte', name: 'Iced Spanish Latte', description: 'Slow-drip espresso over ice, condensed milk swirl.', price: 5.50, isVeg: true, isAvailable: true, addOns: [{ name: 'Caramel Drizzle', price: 0.75 }] },
          { id: 'item-pour-over', name: 'Single Origin Pour-Over', description: 'Floral jasmine notes, bergamot citrus, honey peach.', price: 5.95, isVeg: true, isAvailable: true, addOns: [] },
        ],
      },
      {
        id: 'cat-food',
        name: 'Artisan Toasts & Bowls',
        sortOrder: 2,
        items: [
          { id: 'item-avo-toast', name: 'Smashed Avocado Toast', description: 'Sourdough, smashed avocado, poached egg, chili flakes.', price: 12.50, isVeg: true, isAvailable: true, addOns: [{ name: 'Poached Egg', price: 2.00 }] },
          { id: 'item-acai', name: 'Acaí Breakfast Bowl', description: 'Organic acaí base, granola, seasonal berries, honey.', price: 14.00, isVeg: true, isAvailable: true, addOns: [] },
          { id: 'item-club', name: 'Club Sandwich', description: 'Triple-decker with chicken, bacon, lettuce, tomato.', price: 13.75, isVeg: false, isAvailable: true, addOns: [{ name: 'Fries', price: 3.50 }] },
        ],
      },
      {
        id: 'cat-pastry',
        name: 'Bakery & Pastries',
        sortOrder: 3,
        items: [
          { id: 'item-croissant', name: 'Butter Croissant', description: 'Classic laminated dough, 48-hour cold ferment.', price: 4.25, isVeg: true, isAvailable: true, addOns: [{ name: 'Jam', price: 0.50 }] },
          { id: 'item-cinnamon', name: 'Cinnamon Scroll', description: 'Warm, soft, brown butter cream cheese glaze.', price: 5.00, isVeg: true, isAvailable: true, addOns: [] },
        ],
      },
    ],
    orders: [
      {
        id: 'ord-001',
        tableId: 'T1',
        tableLabel: 'Table 1 (Window)',
        status: 'Preparing',
        items: [{ itemId: 'item-flat-white', name: 'Velvet Flat White', qty: 2, price: 4.75, addOns: [{ name: 'Oat Milk', price: 0.75 }] }],
        subtotal: 11.00,
        tax: 0.94,
        serviceCharge: 0.55,
        total: 12.49,
      },
      {
        id: 'ord-002',
        tableId: 'T1',
        tableLabel: 'Table 1 (Window)',
        status: 'New',
        items: [{ itemId: 'item-avo-toast', name: 'Smashed Avocado Toast', qty: 1, price: 12.50, addOns: [] }],
        subtotal: 12.50,
        tax: 1.06,
        serviceCharge: 0.63,
        total: 14.19,
      },
      {
        id: 'ord-003',
        tableId: 'T4',
        tableLabel: 'Table 4 (Bar High-Top)',
        status: 'Ready',
        items: [
          { itemId: 'item-croissant', name: 'Butter Croissant', qty: 2, price: 4.25, addOns: [] },
          { itemId: 'item-iced-latte', name: 'Iced Spanish Latte', qty: 2, price: 5.50, addOns: [] },
        ],
        subtotal: 19.50,
        tax: 1.66,
        serviceCharge: 0.98,
        total: 22.14,
      },
      {
        id: 'ord-004',
        tableId: 'T2',
        tableLabel: 'Table 2 (Window)',
        status: 'Completed',
        items: [{ itemId: 'item-club', name: 'Club Sandwich', qty: 1, price: 13.75, addOns: [{ name: 'Fries', price: 3.50 }] }],
        subtotal: 17.25,
        tax: 1.47,
        serviceCharge: 0.86,
        total: 19.58,
      },
    ],
  },
  {
    id: 'cafe-ember-kitchen',
    name: 'Ember Kitchen & Bar',
    address: '88 Riverside Drive, Waterfront District',
    ownerEmail: 'kai@emberkitchen.com',
    ownerName: 'Kai Nakamura',
    phone: '+1 (555) 876-5432',
    logoUrl: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=200&auto=format&fit=crop&q=80',
    plan: 'Enterprise',
    settings: {
      taxPercent: 9.0,
      serviceChargePercent: 7.0,
      currency: '₹',
      openingHours: '11:00 AM - 11:00 PM',
    },
    tables: [
      { id: 'T1', label: 'Bar Seat 1', status: 'free' },
      { id: 'T2', label: 'Bar Seat 2', status: 'occupied' },
      { id: 'T3', label: 'Booth A', status: 'free' },
      { id: 'T4', label: 'Booth B', status: 'free' },
    ],
    categories: [
      {
        id: 'cat-small',
        name: 'Small Plates',
        sortOrder: 1,
        items: [
          { id: 'item-bruschetta', name: 'Charred Bruschetta', description: 'Heirloom tomato, basil, aged balsamic on grilled sourdough.', price: 9.00, isVeg: true, isAvailable: true, addOns: [{ name: 'Extra Cheese', price: 2.00 }] },
          { id: 'item-arancini', name: 'Saffron Arancini', description: 'Crispy risotto balls, wild mushroom filling, truffle aioli.', price: 12.00, isVeg: true, isAvailable: true, addOns: [] },
          { id: 'item-wings', name: 'Smoked Chicken Wings', description: '12hr smoked, house glaze, blue cheese dip.', price: 14.50, isVeg: false, isAvailable: true, addOns: [{ name: 'Extra Dip', price: 1.50 }] },
        ],
      },
      {
        id: 'cat-mains',
        name: 'Mains',
        sortOrder: 2,
        items: [
          { id: 'item-salmon', name: 'Pan-Seared Atlantic Salmon', description: 'Herb butter crust, lemon beurre blanc, haricots verts.', price: 28.00, isVeg: false, isAvailable: true, addOns: [] },
          { id: 'item-risotto', name: 'Wild Mushroom Risotto', description: 'Porcini, shiitake, truffle oil, aged parmesan.', price: 22.00, isVeg: true, isAvailable: true, addOns: [{ name: 'Extra Truffle', price: 5.00 }] },
          { id: 'item-burger', name: 'Wagyu Smash Burger', description: 'Double wagyu patty, aged cheddar, special sauce, brioche.', price: 24.50, isVeg: false, isAvailable: true, addOns: [{ name: 'Fries', price: 4.00 }, { name: 'Truffle Fries', price: 6.00 }] },
        ],
      },
      {
        id: 'cat-drinks',
        name: 'Bar & Cocktails',
        sortOrder: 3,
        items: [
          { id: 'item-espresso-martini', name: 'Espresso Martini', description: 'Cold brew, vodka, Kahlúa, three espresso beans.', price: 16.00, isVeg: true, isAvailable: true, addOns: [] },
          { id: 'item-mocktail', name: 'Yuzu Spritz Mocktail', description: 'Yuzu, elderflower, sparkling water, mint.', price: 9.00, isVeg: true, isAvailable: true, addOns: [] },
          { id: 'item-craft-beer', name: 'Rotating Craft Beer', description: 'Ask your server for today\'s tap selection.', price: 8.00, isVeg: true, isAvailable: true, addOns: [] },
        ],
      },
    ],
    orders: [
      {
        id: 'ord-101',
        tableId: 'T2',
        tableLabel: 'Bar Seat 2',
        status: 'Accepted',
        items: [{ itemId: 'item-espresso-martini', name: 'Espresso Martini', qty: 2, price: 16.00, addOns: [] }],
        subtotal: 32.00,
        tax: 2.88,
        serviceCharge: 2.24,
        total: 37.12,
      },
      {
        id: 'ord-102',
        tableId: 'T2',
        tableLabel: 'Bar Seat 2',
        status: 'New',
        items: [
          { itemId: 'item-wings', name: 'Smoked Chicken Wings', qty: 1, price: 14.50, addOns: [{ name: 'Extra Dip', price: 1.50 }] },
          { itemId: 'item-arancini', name: 'Saffron Arancini', qty: 1, price: 12.00, addOns: [] },
        ],
        subtotal: 28.00,
        tax: 2.52,
        serviceCharge: 1.96,
        total: 32.48,
      },
      {
        id: 'ord-103',
        tableId: 'T1',
        tableLabel: 'Bar Seat 1',
        status: 'Completed',
        items: [{ itemId: 'item-burger', name: 'Wagyu Smash Burger', qty: 1, price: 24.50, addOns: [{ name: 'Fries', price: 4.00 }] }],
        subtotal: 28.50,
        tax: 2.57,
        serviceCharge: 1.99,
        total: 33.06,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 CafeFlow Emulator Seed — Starting...\n');
  const now = new Date().toISOString();
  const batch = db.batch();

  // ── Platform Admin ─────────────────────────────────────────────────────────
  console.log('Creating platform admin...');
  const adminUid = await upsertUser(
    'admin@cafeflow.com',
    'AdminPass123!',
    'CafeFlow Super Admin'
  );
  await adminAuth.setCustomUserClaims(adminUid, { role: 'platform_admin' });
  batch.set(db.doc(`platformAdmins/${adminUid}`), { email: 'admin@cafeflow.com', createdAt: now });
  batch.set(db.doc(`users/${adminUid}`), {
    uid: adminUid,
    email: 'admin@cafeflow.com',
    name: 'CafeFlow Super Admin',
    role: 'platform_admin',
    createdAt: now,
  });
  console.log(`  ✓ admin@cafeflow.com  (uid: ${adminUid})`);

  // ── Cafes ──────────────────────────────────────────────────────────────────
  for (const cafe of cafes) {
    console.log(`\nCreating cafe: ${cafe.name}...`);

    // Create cafe owner Auth user
    const ownerUid = await upsertUser(cafe.ownerEmail, 'CafeOwner123!', cafe.ownerName);
    await adminAuth.setCustomUserClaims(ownerUid, { role: 'cafe_owner', cafeId: cafe.id });
    batch.set(db.doc(`users/${ownerUid}`), {
      uid: ownerUid,
      email: cafe.ownerEmail,
      name: cafe.ownerName,
      role: 'cafe_owner',
      cafeId: cafe.id,
      createdAt: now,
    });
    console.log(`  ✓ Owner: ${cafe.ownerEmail}  (uid: ${ownerUid})`);

    // Cafe root document
    batch.set(db.doc(`cafes/${cafe.id}`), {
      id: cafe.id,
      name: cafe.name,
      address: cafe.address,
      ownerName: cafe.ownerName,
      email: cafe.ownerEmail,
      phone: cafe.phone,
      logoUrl: cafe.logoUrl,
      plan: cafe.plan,
      status: 'active',
      createdAt: now,
      settings: cafe.settings,
      stats: { totalOrders: 0, totalRevenue: 0 },
    });

    // Tables
    for (const table of cafe.tables) {
      batch.set(db.doc(`cafes/${cafe.id}/tables/${table.id}`), table);
    }
    console.log(`  ✓ ${cafe.tables.length} tables`);

    // Menu categories + items
    let itemCount = 0;
    for (const cat of cafe.categories) {
      const { items, ...catData } = cat;
      batch.set(db.doc(`cafes/${cafe.id}/menuCategories/${cat.id}`), catData);
      for (const item of items) {
        batch.set(
          db.doc(`cafes/${cafe.id}/menuCategories/${cat.id}/items/${item.id}`),
          { ...item, categoryId: cat.id, photoUrl: '' }
        );
        itemCount++;
      }
    }
    console.log(`  ✓ ${cafe.categories.length} categories, ${itemCount} items`);

    // Orders
    for (const order of cafe.orders) {
      batch.set(db.doc(`cafes/${cafe.id}/orders/${order.id}`), {
        ...order,
        cafeId: cafe.id,
        createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        updatedAt: now,
      });
    }
    console.log(`  ✓ ${cafe.orders.length} sample orders`);
  }

  // ── Platform Stats initial doc ─────────────────────────────────────────────
  batch.set(db.doc('platformStats/summary'), {
    totalOrders: 0,
    totalRevenue: 0,
    lastUpdated: now,
  }, { merge: true });

  // ── Commit all writes ──────────────────────────────────────────────────────
  await batch.commit();

  console.log('\n✅ Seed complete!\n');
  console.log('──────────────────────────────────────────────');
  console.log('  Login credentials (emulator only):');
  console.log('  ┌──────────────────────────────────────────┐');
  console.log('  │ admin@cafeflow.com      AdminPass123!    │');
  console.log('  │ elena@velvetroast.com   CafeOwner123!    │');
  console.log('  │ kai@emberkitchen.com    CafeOwner123!    │');
  console.log('  └──────────────────────────────────────────┘');
  console.log('\n  Emulator UI: http://localhost:4000\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
