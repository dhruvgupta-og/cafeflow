import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Cafe,
  Table,
  MenuCategory,
  MenuItem,
  OrderItem,
  AddOn,
  Order,
  OrderStatus
} from '../../types';
import {
  Coffee,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  X,
  Search,
  Bell,
  Leaf,
  Beef,
  Sparkles,
  ArrowRight,
  Clock,
  ChefHat,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Flame,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CartLineItem {
  cartItemId: string;
  menuItem: MenuItem;
  qty: number;
  selectedAddOns: AddOn[];
  notes?: string;
  totalPrice: number;
}

export const CustomerOrderApp: React.FC = () => {
  const { cafeId, tableId } = useParams<{ cafeId: string; tableId: string }>();

  // Data state
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'status'>('menu');

  // Modal customization state
  const [modalQty, setModalQty] = useState<number>(1);
  const [modalAddOns, setModalAddOns] = useState<AddOn[]>([]);
  const [modalNotes, setModalNotes] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [tableOrderNotes, setTableOrderNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Call waiter state
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [waiterCalledSuccess, setWaiterCalledSuccess] = useState(false);

  // Load Cafe & Table Data
  useEffect(() => {
    if (!cafeId) return;

    // 1. Get Cafe Document
    const unsubCafe = onSnapshot(doc(db, 'cafes', cafeId), (docSnap) => {
      if (docSnap.exists()) {
        setCafe({ id: docSnap.id, ...docSnap.data() } as Cafe);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Customer cafe load error:', err);
      setLoading(false);
    });

    // 2. Get Table Document if tableId provided
    if (tableId) {
      getDoc(doc(db, `cafes/${cafeId}/tables`, tableId)).then((tSnap) => {
        if (tSnap.exists()) {
          setTable({ id: tSnap.id, ...tSnap.data() } as Table);
        } else {
          setTable({ id: tableId, label: `Table ${tableId}`, status: 'occupied' });
        }
      });
    }

    // 3. Load Menu
    const loadMenu = async () => {
      try {
        const catsSnap = await getDocs(collection(db, `cafes/${cafeId}/menuCategories`));
        const cats: MenuCategory[] = [];
        const items: MenuItem[] = [];

        for (const cDoc of catsSnap.docs) {
          cats.push({ id: cDoc.id, ...cDoc.data() } as MenuCategory);
          const iSnap = await getDocs(collection(db, `cafes/${cafeId}/menuCategories/${cDoc.id}/items`));
          iSnap.forEach(i => {
            const data = { id: i.id, categoryId: cDoc.id, ...i.data() } as MenuItem;
            // Only show available items to customer
            if (data.isAvailable !== false) {
              items.push(data);
            }
          });
        }

        cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(cats);
        setMenuItems(items);
      } catch (err) {
        console.error('Error loading customer menu:', err);
      }
    };
    loadMenu();

    // 4. Real-time Active Orders for this table
    const ordersQuery = query(collection(db, `cafes/${cafeId}/orders`));
    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      const list: Order[] = [];
      snap.forEach(d => {
        const o = { id: d.id, ...d.data() } as Order;
        if (o.tableId === tableId && ['New', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.status)) {
          list.push(o);
        }
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActiveOrders(list);
    }, (err) => {
      console.warn('Orders snapshot error:', err);
    });

    return () => {
      unsubCafe();
      unsubOrders();
    };
  }, [cafeId, tableId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-100 space-y-4">
        <Coffee className="w-10 h-10 text-amber-500 animate-bounce" />
        <p className="text-sm font-medium text-stone-400">Loading fresh menu...</p>
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-100 p-6 text-center">
        <h2 className="text-xl font-bold font-serif mb-2">Cafe Not Found</h2>
        <p className="text-xs text-stone-400 mb-4">Please scan a valid table QR code.</p>
      </div>
    );
  }

  const currency = cafe.settings.currency || '$';
  const taxRate = (cafe.settings.taxPercent || 0) / 100;
  const serviceRate = (cafe.settings.serviceChargePercent || 0) / 100;

  // Open item modal
  const handleOpenItemModal = (item: MenuItem) => {
    setSelectedItemForModal(item);
    setModalQty(1);
    setModalAddOns([]);
    setModalNotes('');
  };

  // Toggle add-on in modal
  const handleToggleAddOn = (addon: AddOn) => {
    const exists = modalAddOns.some(a => a.name === addon.name);
    if (exists) {
      setModalAddOns(modalAddOns.filter(a => a.name !== addon.name));
    } else {
      setModalAddOns([...modalAddOns, addon]);
    }
  };

  // Add customized item to cart
  const handleAddToCart = () => {
    if (!selectedItemForModal) return;

    const addOnsTotal = modalAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
    const unitPrice = selectedItemForModal.price + addOnsTotal;

    const newLine: CartLineItem = {
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      menuItem: selectedItemForModal,
      qty: modalQty,
      selectedAddOns: modalAddOns,
      notes: modalNotes.trim() || undefined,
      totalPrice: unitPrice * modalQty
    };

    setCart([...cart, newLine]);
    setSelectedItemForModal(null);
  };

  // Cart quantity controls
  const handleUpdateCartQty = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const nextQty = item.qty + delta;
            if (nextQty <= 0) return null;
            const addOnsTotal = item.selectedAddOns.reduce((sum, a) => sum + (a.price || 0), 0);
            const unitPrice = item.menuItem.price + addOnsTotal;
            return {
              ...item,
              qty: nextQty,
              totalPrice: unitPrice * nextQty
            };
          }
          return item;
        })
        .filter(Boolean) as CartLineItem[];
    });
  };

  // Calculate cart totals
  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartTax = cartSubtotal * taxRate;
  const cartService = cartSubtotal * serviceRate;
  const cartTotal = cartSubtotal + cartTax + cartService;
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Place Order to Firestore
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !cafeId) return;
    setPlacingOrder(true);

    try {
      const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const orderItems: OrderItem[] = cart.map(line => ({
        itemId: line.menuItem.id,
        name: line.menuItem.name,
        price: line.menuItem.price,
        qty: line.qty,
        addOns: line.selectedAddOns,
        notes: line.notes
      }));

      const newOrder: Order = {
        id: orderId,
        cafeId,
        tableId: tableId || 'Walk-in',
        tableLabel: table?.label || `Table ${tableId}`,
        items: orderItems,
        subtotal: Number(cartSubtotal.toFixed(2)),
        tax: Number(cartTax.toFixed(2)),
        serviceCharge: Number(cartService.toFixed(2)),
        total: Number(cartTotal.toFixed(2)),
        status: 'New',
        notes: tableOrderNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Write order doc
      await setDoc(doc(db, `cafes/${cafeId}/orders`, orderId), newOrder);

      // 2. Set table occupied
      if (tableId) {
        await setDoc(doc(db, `cafes/${cafeId}/tables`, tableId), {
          id: tableId,
          label: table?.label || `Table ${tableId}`,
          status: 'occupied'
        }, { merge: true });
      }

      // Success celebration
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      } catch {}

      // Clear cart & switch to active order tracking tab
      setCart([]);
      setTableOrderNotes('');
      setIsCartOpen(false);
      setActiveTab('status');
    } catch (err) {
      console.error('Error placing order:', err);
      alert('Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Call Waiter Request
  const handleCallWaiter = async () => {
    if (!cafeId || callingWaiter) return;
    setCallingWaiter(true);
    try {
      const alertId = `alert-${Date.now()}`;
      await setDoc(doc(db, `cafes/${cafeId}/alerts`, alertId), {
        id: alertId,
        cafeId,
        tableId: tableId || 'Walk-in',
        tableLabel: table?.label || `Table ${tableId}`,
        type: 'call_waiter',
        message: `Customer at ${table?.label || `Table ${tableId}`} requested assistance.`,
        resolved: false,
        createdAt: new Date().toISOString()
      });

      setWaiterCalledSuccess(true);
      setTimeout(() => setWaiterCalledSuccess(false), 5000);
    } catch (err) {
      console.error('Error calling waiter:', err);
    } finally {
      setCallingWaiter(false);
    }
  };

  // Filter items
  const filteredItems = menuItems.filter(it => {
    const matchesCat = selectedCatId === 'all' || it.categoryId === selectedCatId;
    const matchesSearch = it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans pb-28">
      {/* Top Cafe Branding Banner */}
      <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur border-b border-stone-800 px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {cafe.logoUrl ? (
              <img src={cafe.logoUrl} alt={cafe.name} className="w-10 h-10 object-cover rounded-xl border border-stone-700 shadow" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                <Coffee className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-base font-serif text-stone-100 leading-tight">{cafe.name}</h1>
              <p className="text-[11px] text-stone-400">{cafe.settings.openingHours || 'Open for Dining'}</p>
            </div>
          </div>

          {/* Table Badge & Assistance */}
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-stone-950 text-xs font-black font-mono shadow-sm">
              {table?.label || `Table ${tableId || '1'}`}
            </span>

            <button
              onClick={handleCallWaiter}
              disabled={callingWaiter || waiterCalledSuccess}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                waiterCalledSuccess
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-400 border-stone-700'
              }`}
              title="Call Server to Table"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Waiter Called Notification Banner */}
      {waiterCalledSuccess && (
        <div className="max-w-lg mx-auto px-4 mt-3">
          <div className="bg-emerald-950/90 border border-emerald-500/80 p-3 rounded-2xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fadeIn">
            <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Waiter notified! A server will be at your table shortly.</span>
          </div>
        </div>
      )}

      {/* Tab Switcher (Menu vs. Live Table Order Tracker) */}
      <div className="max-w-lg mx-auto px-4 mt-3">
        <div className="grid grid-cols-2 bg-stone-900 p-1 rounded-2xl border border-stone-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'menu' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" /> Browse Menu
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition relative ${
              activeTab === 'status' ? 'bg-amber-500 text-stone-950 shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Order Status
            {activeOrders.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'status' ? 'bg-stone-950 text-amber-400' : 'bg-amber-500 text-stone-950'
              }`}>
                {activeOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'menu' ? (
        <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search coffee, bowls, pastries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-800 rounded-2xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 shadow-inner"
            />
          </div>

          {/* Sticky Horizontal Categories Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <button
              onClick={() => setSelectedCatId('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedCatId === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  selectedCatId === cat.id
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items List */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-8 text-center text-stone-500 text-xs">
                No items found in this section.
              </div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItemModal(item)}
                  className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-3 flex gap-3 cursor-pointer transition active:scale-[0.99] shadow-md"
                >
                  {/* Item Image */}
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-stone-950 shrink-0">
                    <img
                      src={item.photoUrl || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1">
                      {item.isVeg ? (
                        <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Leaf className="w-2.5 h-2.5" /> VEG
                        </span>
                      ) : (
                        <span className="bg-rose-950/90 text-rose-300 border border-rose-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5" /> NON-VEG
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info & Add Action */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-stone-100 line-clamp-1">{item.name}</h3>
                      <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-800/50">
                      <span className="text-sm font-extrabold text-amber-400 font-serif">
                        {currency}{item.price.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Order Status Tracker View */
        <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-serif text-stone-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> Active Table Orders
            </h2>
            <button
              onClick={() => setActiveTab('menu')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              + Order More Items
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center text-stone-400 space-y-3">
              <ShoppingBag className="w-10 h-10 text-stone-600 mx-auto" />
              <p className="text-sm font-bold text-stone-200">No Orders in Kitchen</p>
              <p className="text-xs text-stone-500">
                Browse our fresh seasonal menu and place your first culinary selections.
              </p>
              <button
                onClick={() => setActiveTab('menu')}
                className="px-4 py-2 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => {
                const isNew = order.status === 'New';
                const isAccepted = order.status === 'Accepted';
                const isPrep = order.status === 'Preparing';
                const isReady = order.status === 'Ready';
                const isServed = order.status === 'Served';

                return (
                  <div
                    key={order.id}
                    className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4 shadow-xl"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-stone-800 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-stone-400">
                          TICKET #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <h4 className="text-sm font-bold text-stone-100">
                          {order.tableLabel || `Table ${order.tableId}`}
                        </h4>
                      </div>
                      <span className="font-serif font-bold text-amber-400 text-sm">
                        {currency}{(order.total || order.subtotal || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Stage Timeline Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-stone-400">
                        <span className={isNew ? 'text-amber-400' : 'text-stone-300'}>Received</span>
                        <span className={isAccepted ? 'text-indigo-400' : 'text-stone-300'}>Accepted</span>
                        <span className={isPrep ? 'text-amber-400' : 'text-stone-300'}>In Kitchen</span>
                        <span className={isReady ? 'text-emerald-400' : 'text-stone-300'}>Ready</span>
                        <span className={isServed ? 'text-emerald-400' : 'text-stone-300'}>Served</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden border border-stone-800">
                        <div
                          className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 h-full transition-all duration-500"
                          style={{
                            width: isNew ? '20%' : isAccepted ? '40%' : isPrep ? '65%' : isReady ? '85%' : '100%'
                          }}
                        />
                      </div>
                    </div>

                    {/* Status Live Message */}
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs flex items-center gap-2">
                      {isNew && <Clock className="w-4 h-4 text-amber-400 animate-spin" />}
                      {isAccepted && <Check className="w-4 h-4 text-indigo-400" />}
                      {isPrep && <Flame className="w-4 h-4 text-amber-400 animate-pulse" />}
                      {isReady && <ChefHat className="w-4 h-4 text-emerald-400 animate-bounce" />}
                      {isServed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}

                      <span className="text-stone-200 font-medium">
                        {isNew && 'Order received! Waiting for kitchen to accept.'}
                        {isAccepted && 'Order accepted by staff. Heading to preparation station.'}
                        {isPrep && 'Chef is currently preparing your dishes!'}
                        {isReady && 'Your order is freshly prepared and coming to your table!'}
                        {isServed && 'Enjoy your meal! Served at your table.'}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-1.5 text-xs text-stone-300 pt-1">
                      {order.items.map((it, iIdx) => (
                        <div key={iIdx} className="flex justify-between">
                          <span>{it.qty}x {it.name}</span>
                          <span className="font-mono text-stone-400">
                            {currency}{(it.price * it.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Cart Summary Bar */}
      {cart.length > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold p-3.5 rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-between transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-stone-950 text-amber-400 flex items-center justify-center text-xs font-mono font-black">
                  {cartItemCount}
                </span>
                <span className="text-xs uppercase tracking-wider">View Order Basket</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-extrabold">{currency}{cartTotal.toFixed(2)}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Item Customization Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md text-stone-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Image */}
            <div className="relative h-44 w-full bg-stone-950 shrink-0">
              <img
                src={selectedItemForModal.photoUrl || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80'}
                alt={selectedItemForModal.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-stone-900/80 text-stone-300 hover:text-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <h3 className="text-lg font-bold font-serif text-stone-100">{selectedItemForModal.name}</h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">{selectedItemForModal.description}</p>
                <span className="text-base font-bold text-amber-400 font-serif mt-2 block">
                  {currency}{selectedItemForModal.price.toFixed(2)}
                </span>
              </div>

              {/* Add-ons picker */}
              {selectedItemForModal.addOns && selectedItemForModal.addOns.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                    Customize / Add-ons
                  </label>
                  <div className="space-y-1.5">
                    {selectedItemForModal.addOns.map((addon, aIdx) => {
                      const isChecked = modalAddOns.some(a => a.name === addon.name);
                      return (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={() => handleToggleAddOn(addon)}
                          className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                            isChecked
                              ? 'bg-amber-500/10 border-amber-500 text-stone-100'
                              : 'bg-stone-950 border-stone-800 text-stone-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isChecked ? 'bg-amber-500 border-amber-400 text-stone-950' : 'border-stone-700'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{addon.name}</span>
                          </div>
                          <span className="font-mono text-amber-400">+{currency}{addon.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div className="pt-2 border-t border-stone-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1">
                  Special Kitchen Request
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra hot, oat milk, sauce on side"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quantity Selector */}
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-300">Quantity</span>
                <div className="flex items-center gap-3 bg-stone-950 p-1 rounded-xl border border-stone-800">
                  <button
                    type="button"
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono">{modalQty}</span>
                  <button
                    type="button"
                    onClick={() => setModalQty(modalQty + 1)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer Add Button */}
            <div className="p-4 bg-stone-950 border-t border-stone-800">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
              >
                Add {modalQty} to Order • {currency}
                {((selectedItemForModal.price + modalAddOns.reduce((s, a) => s + a.price, 0)) * modalQty).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md text-stone-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/60">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm font-serif">Your Table Basket ({table?.label || `Table ${tableId}`})</h3>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-1 text-stone-400 hover:text-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 divide-y divide-stone-800/60">
              {cart.map(item => (
                <div key={item.cartItemId} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-stone-100">{item.menuItem.name}</span>
                    <span className="font-mono text-xs text-amber-400 font-bold">
                      {currency}{item.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Addons */}
                  {item.selectedAddOns.length > 0 && (
                    <div className="text-[11px] text-stone-400">
                      {item.selectedAddOns.map(a => `+ ${a.name}`).join(', ')}
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-[10px] text-amber-300 italic">
                      "{item.notes}"
                    </div>
                  )}

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-stone-500">Qty</span>
                    <div className="flex items-center gap-2 bg-stone-950 p-1 rounded-lg border border-stone-800">
                      <button
                        onClick={() => handleUpdateCartQty(item.cartItemId, -1)}
                        className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-mono font-bold">{item.qty}</span>
                      <button
                        onClick={() => handleUpdateCartQty(item.cartItemId, 1)}
                        className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Table Order Notes */}
              <div className="pt-3">
                <label className="block text-[11px] font-bold uppercase text-stone-400 mb-1">
                  General Order Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please bring extra napkins & water"
                  value={tableOrderNotes}
                  onChange={(e) => setTableOrderNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Financial Calculation */}
              <div className="pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-stone-200">{currency}{cartSubtotal.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-stone-400">
                    <span>Tax ({cafe.settings.taxPercent}%):</span>
                    <span className="font-mono text-stone-200">{currency}{cartTax.toFixed(2)}</span>
                  </div>
                )}
                {serviceRate > 0 && (
                  <div className="flex justify-between text-stone-400">
                    <span>Service Charge ({cafe.settings.serviceChargePercent}%):</span>
                    <span className="font-mono text-stone-200">{currency}{cartService.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline font-bold text-sm text-stone-100 pt-2 border-t border-stone-800">
                  <span>Total Due:</span>
                  <span className="text-xl font-serif text-amber-400 font-extrabold">{currency}{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Send to Kitchen Button */}
            <div className="p-4 bg-stone-950 border-t border-stone-800">
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition disabled:opacity-50"
              >
                {placingOrder ? 'Sending to Kitchen...' : `Send Order to Kitchen (${currency}${cartTotal.toFixed(2)})`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
