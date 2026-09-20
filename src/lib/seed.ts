import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

export async function seedInitialDemoData(force = false): Promise<boolean> {
  try {
    const cafesRef = collection(db, 'cafes');
    const snapshot = await getDocs(cafesRef);
    if (!snapshot.empty && !force) {
      return false; // already has data
    }

    console.log('Seeding initial CafeFlow demo cafes and menus...');

    const sampleCafes = [
      {
        id: 'cafe-velvet-roast',
        name: 'Velvet Roast & Bakery',
        address: '442 Market Street, Downtown Arts District',
        ownerName: 'Elena Rostova',
        email: 'elena@velvetroast.com',
        phone: '+1 (555) 234-5678',
        logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80',
        plan: 'Pro' as const,
        status: 'active' as const,
        createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        settings: {
          taxPercent: 8.5,
          serviceChargePercent: 5.0,
          currency: '$',
          openingHours: '7:00 AM - 9:00 PM',
        },
        tables: [
          { id: 'T1', label: 'Table 1 (Window)', status: 'free' },
          { id: 'T2', label: 'Table 2 (Window)', status: 'occupied' },
          { id: 'T3', label: 'Table 3 (Patio Booth)', status: 'free' },
          { id: 'T4', label: 'Table 4 (Bar High-Top)', status: 'free' },
          { id: 'T5', label: 'Table 5 (Lounge Sofa)', status: 'free' },
          { id: 'T6', label: 'Table 6 (Center 4-Top)', status: 'free' },
        ],
        categories: [
          {
            id: 'cat-espresso',
            name: 'Artisan Coffee & Espresso',
            sortOrder: 1,
            items: [
              {
                id: 'item-flat-white',
                name: 'Velvet Flat White',
                description: 'Double ristretto with micro-foamed organic whole milk or oat milk.',
                price: 4.75,
                photoUrl: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: [
                  { name: 'Oat Milk Sub', price: 0.75 },
                  { name: 'Extra Double Shot', price: 1.50 },
                  { name: 'Madagascar Vanilla Syrup', price: 0.85 }
                ]
              },
              {
                id: 'item-iced-spanish-latte',
                name: 'Iced Spanish Dolce Latte',
                description: 'Slow-drip espresso over ice, condensed milk swirl, and cinnamon dust.',
                price: 5.50,
                photoUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: [
                  { name: 'Salted Caramel Drizzle', price: 0.75 },
                  { name: 'Whipped Cream', price: 0.50 }
                ]
              },
              {
                id: 'item-pour-over-ethiopia',
                name: 'Single Origin Yirgacheffe Pour-Over',
                description: 'Floral jasmine notes, bergamot citrus, and honey peach undertone.',
                price: 5.95,
                photoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: []
              }
            ]
          },
          {
            id: 'cat-bakery',
            name: 'Fresh Bakery & Pastries',
            sortOrder: 2,
            items: [
              {
                id: 'item-almond-croissant',
                name: 'Twice-Baked Almond Croissant',
                description: 'Golden flaky French croissant filled with rich almond frangipane cream and toasted sliced almonds.',
                price: 4.95,
                photoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: [
                  { name: 'Warm Chocolate Sauce', price: 1.00 }
                ]
              },
              {
                id: 'item-avocado-tartine',
                name: 'Sourdough Avocado Tartine',
                description: 'Crushed Hass avocados, marinated heirloom cherry tomatoes, dukkah seeds, and micro-radish on country sourdough.',
                price: 11.50,
                photoUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: [
                  { name: 'Poached Free-Range Egg', price: 2.00 },
                  { name: 'Smoked Salmon Cured', price: 4.00 }
                ]
              },
              {
                id: 'item-truffle-brioche-egg',
                name: 'Truffle Scramble Brioche Bun',
                description: 'Velvety scrambled eggs, black truffle aioli, aged cheddar, and crispy bacon in a toasted brioche bun.',
                price: 13.00,
                photoUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
                isVeg: false,
                isAvailable: true,
                addOns: [
                  { name: 'Extra Crispy Bacon', price: 2.50 },
                  { name: 'Avocado Slices', price: 2.00 }
                ]
              }
            ]
          },
          {
            id: 'cat-refreshers',
            name: 'Matcha, Teas & Coolers',
            sortOrder: 3,
            items: [
              {
                id: 'item-ceremonial-matcha',
                name: 'Iced Uji Ceremonial Matcha Latte',
                description: 'Stone-ground ceremonial grade matcha whisked fresh with organic oat milk and raw agave nectar.',
                price: 6.25,
                photoUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: [
                  { name: 'Vanilla Cloud Foam', price: 1.25 },
                  { name: 'Strawberry Puree Swirl', price: 1.00 }
                ]
              },
              {
                id: 'item-yuzu-sparkling',
                name: 'Yuzu Honey Sparkling Fizz',
                description: 'Japanese yuzu juice, crushed fresh mint, raw wildflower honey, and soda water over crushed ice.',
                price: 5.75,
                photoUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: []
              }
            ]
          }
        ]
      },
      {
        id: 'cafe-matcha-haven',
        name: 'The Matcha Haven & Teahouse',
        address: '18 Garden Walk, North Zen Terrace',
        ownerName: 'Kenji Takahashi',
        email: 'kenji@matchahaven.com',
        phone: '+1 (555) 789-0123',
        logoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=200&auto=format&fit=crop&q=80',
        plan: 'Starter' as const,
        status: 'active' as const,
        createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
        settings: {
          taxPercent: 7.0,
          serviceChargePercent: 0,
          currency: '$',
          openingHours: '8:00 AM - 7:00 PM',
        },
        tables: [
          { id: 'T1', label: 'Tatami 1', status: 'free' },
          { id: 'T2', label: 'Tatami 2', status: 'free' },
          { id: 'T3', label: 'Garden Table A', status: 'free' },
          { id: 'T4', label: 'Garden Table B', status: 'free' }
        ],
        categories: [
          {
            id: 'cat-matcha-specials',
            name: 'Signature Matcha',
            sortOrder: 1,
            items: [
              {
                id: 'item-matcha-affogato',
                name: 'Kyoto Matcha Affogato',
                description: 'Hokkaido vanilla bean gelato drowned in concentrated warm ceremonial matcha.',
                price: 6.50,
                photoUrl: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: [
                  { name: 'Red Bean Mochi', price: 1.50 }
                ]
              },
              {
                id: 'item-hojicha-latte',
                name: 'Roasted Hojicha Milk Tea',
                description: 'Earthy roasted green tea with toasted caramel aroma and whole oat milk.',
                price: 5.50,
                photoUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
                isVeg: true,
                isAvailable: true,
                addOns: []
              }
            ]
          }
        ]
      }
    ];

    for (const cafeData of sampleCafes) {
      const { tables, categories, ...cafeDoc } = cafeData;
      await setDoc(doc(db, 'cafes', cafeData.id), cafeDoc);

      // Add tables
      for (const table of tables) {
        await setDoc(doc(db, `cafes/${cafeData.id}/tables`, table.id), table);
      }

      // Add categories and items
      for (const cat of categories) {
        const { items, ...catDoc } = cat;
        await setDoc(doc(db, `cafes/${cafeData.id}/menuCategories`, cat.id), catDoc);

        for (const item of items) {
          await setDoc(doc(db, `cafes/${cafeData.id}/menuCategories/${cat.id}/items`, item.id), {
            ...item,
            categoryId: cat.id
          });
        }
      }

      // Seed a live sample order for Table 2 on Velvet Roast
      if (cafeData.id === 'cafe-velvet-roast') {
        const sampleOrderId = 'ord-demo-001';
        await setDoc(doc(db, `cafes/${cafeData.id}/orders`, sampleOrderId), {
          id: sampleOrderId,
          cafeId: cafeData.id,
          tableId: 'T2',
          tableLabel: 'Table 2 (Window)',
          items: [
            {
              itemId: 'item-flat-white',
              name: 'Velvet Flat White',
              qty: 2,
              price: 4.75,
              addOns: [{ name: 'Oat Milk Sub', price: 0.75 }],
              notes: 'Extra hot please'
            },
            {
              itemId: 'item-almond-croissant',
              name: 'Twice-Baked Almond Croissant',
              qty: 1,
              price: 4.95,
              addOns: [{ name: 'Warm Chocolate Sauce', price: 1.00 }]
            }
          ],
          status: 'Preparing',
          subtotal: 16.95,
          tax: 1.44,
          serviceCharge: 0.85,
          total: 19.24,
          createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        });

        // Add an active alert
        await setDoc(doc(db, `cafes/${cafeData.id}/alerts`, 'alert-demo-001'), {
          id: 'alert-demo-001',
          cafeId: cafeData.id,
          tableId: 'T2',
          tableLabel: 'Table 2 (Window)',
          type: 'call_waiter',
          createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          resolved: false
        });

        // Seed some past completed bills for analytics
        const historicalBills = [
          {
            id: 'bill-past-1',
            cafeId: cafeData.id,
            tableId: 'T1',
            tableLabel: 'Table 1 (Window)',
            orderIds: ['ord-past-1'],
            subtotal: 24.50,
            tax: 2.08,
            serviceCharge: 1.23,
            total: 27.81,
            paymentMethod: 'Card' as const,
            status: 'paid' as const,
            createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            paidAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
            itemsSummary: [{ name: 'Avocado Tartine', qty: 2, total: 23.00 }, { name: 'Flat White', qty: 1, total: 4.75 }]
          },
          {
            id: 'bill-past-2',
            cafeId: cafeData.id,
            tableId: 'T4',
            tableLabel: 'Table 4 (Bar High-Top)',
            orderIds: ['ord-past-2'],
            subtotal: 38.00,
            tax: 3.23,
            serviceCharge: 1.90,
            total: 43.13,
            paymentMethod: 'UPI' as const,
            status: 'paid' as const,
            createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
            paidAt: new Date(Date.now() - 5.5 * 3600 * 1000).toISOString(),
            itemsSummary: [{ name: 'Truffle Scramble Brioche Bun', qty: 2, total: 26.00 }, { name: 'Ceremonial Matcha', qty: 2, total: 12.50 }]
          },
          {
            id: 'bill-past-3',
            cafeId: cafeData.id,
            tableId: 'T3',
            tableLabel: 'Table 3 (Patio Booth)',
            orderIds: ['ord-past-3'],
            subtotal: 18.25,
            tax: 1.55,
            serviceCharge: 0.91,
            total: 20.71,
            paymentMethod: 'Cash' as const,
            status: 'paid' as const,
            createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            paidAt: new Date(Date.now() - 23.5 * 3600 * 1000).toISOString(),
            itemsSummary: [{ name: 'Yuzu Honey Sparkling Fizz', qty: 2, total: 11.50 }, { name: 'Almond Croissant', qty: 1, total: 4.95 }]
          }
        ];

        for (const bill of historicalBills) {
          await setDoc(doc(db, `cafes/${cafeData.id}/bills`, bill.id), bill);
        }
      }
    }

    console.log('Seed demo data completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return false;
  }
}

export const seedDemoDataIfNeeded = () => seedInitialDemoData(false);
