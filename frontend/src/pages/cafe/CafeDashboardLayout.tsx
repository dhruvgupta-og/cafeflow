import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Cafe,
  Table,
  MenuCategory,
  MenuItem,
  Order,
  Bill,
  CafeAlert,
  StaffPermissions
} from '../../types';
import {
  LiveOrdersTab
} from './tabs/LiveOrdersTab';
import {
  TablesTab
} from './tabs/TablesTab';
import {
  MenuTab
} from './tabs/MenuTab';
import {
  BillingTab
} from './tabs/BillingTab';
import {
  SalesTab
} from './tabs/SalesTab';
import {
  SettingsTab
} from './tabs/SettingsTab';
import {
  Coffee,
  ChefHat,
  Layers,
  Utensils,
  Receipt,
  TrendingUp,
  Settings,
  Bell,
  Volume2,
  VolumeX,
  ExternalLink,
  Shield,
  LogOut,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { playOrderNotificationSound, playWaiterAlertSound } from '../../lib/sound';

export const CafeDashboardLayout: React.FC = () => {
  const { cafeId } = useParams<{ cafeId: string }>();
  const { userProfile, isCafeStaff, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'menu' | 'billing' | 'sales' | 'settings'>('orders');

  const isOwner = userProfile?.role === 'cafe_owner' || userProfile?.role === 'platform_admin';
  const perms: Partial<StaffPermissions> = userProfile?.permissions || {};
  
  const canManageTables = isOwner || perms.canManageTables;
  const canManageMenu = isOwner || perms.canManageMenu;
  const canViewBilling = isOwner || perms.canViewBilling || perms.canManageBilling;
  const canManageSettings = isOwner || perms.canManageStaff;
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [alerts, setAlerts] = useState<CafeAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const isFirstOrdersSnapshot = useRef(true);
  const isFirstAlertsSnapshot = useRef(true);
  const previousOrderIds = useRef<Set<string>>(new Set());
  const previousAlertIds = useRef<Set<string>>(new Set());

  // Authorization check
  const authorized = cafeId ? isCafeStaff(cafeId) : false;

  // Load Menu Categories & nested Items
  const loadMenuData = async (cid: string) => {
    try {
      const catsSnap = await getDocs(collection(db, `cafes/${cid}/menuCategories`));
      const cats: MenuCategory[] = [];
      const allItems: MenuItem[] = [];

      for (const cDoc of catsSnap.docs) {
        const catData = { id: cDoc.id, ...cDoc.data() } as MenuCategory;
        cats.push(catData);

        const itemsSnap = await getDocs(collection(db, `cafes/${cid}/menuCategories/${cDoc.id}/items`));
        itemsSnap.forEach(iDoc => {
          allItems.push({ id: iDoc.id, categoryId: cDoc.id, ...iDoc.data() } as MenuItem);
        });
      }

      cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setCategories(cats);
      setMenuItems(allItems);
    } catch (e) {
      console.error('Error fetching menu items:', e);
    }
  };

  useEffect(() => {
    if (!cafeId) return;

    // 1. Fetch Cafe Profile
    const unsubCafe = onSnapshot(doc(db, 'cafes', cafeId), (docSnap) => {
      if (docSnap.exists()) {
        setCafe({ id: docSnap.id, ...docSnap.data() } as Cafe);
      } else {
        setCafe(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Cafe snapshot error:', err);
      setLoading(false);
    });

    // 2. Real-time Tables listener
    const unsubTables = onSnapshot(collection(db, `cafes/${cafeId}/tables`), (snap) => {
      const list: Table[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Table));
      list.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      setTables(list);
    }, (err) => {
      console.warn('Tables snapshot error:', err);
    });

    // 3. Load initial menu
    loadMenuData(cafeId);

    // 4. Real-time Orders listener with new order detection & audio bell chime
    const ordersQuery = query(collection(db, `cafes/${cafeId}/orders`));
    const unsubOrders = onSnapshot(ordersQuery, (snap) => {
      const ordList: Order[] = [];
      const currentIds = new Set<string>();

      snap.forEach(d => {
        const data = { id: d.id, ...d.data() } as Order;
        ordList.push(data);
        currentIds.add(d.id);

        // Check if this is a newly created order (not in previous snapshot)
        if (!isFirstOrdersSnapshot.current && !previousOrderIds.current.has(d.id)) {
          if (soundEnabled) {
            playOrderNotificationSound();
          }
        }
      });

      // Sort newest first
      ordList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setOrders(ordList);

      previousOrderIds.current = currentIds;
      isFirstOrdersSnapshot.current = false;
    }, (err) => {
      console.warn('Orders snapshot error:', err);
    });

    // 5. Real-time Alerts listener (Call Waiter)
    const alertsQuery = query(collection(db, `cafes/${cafeId}/alerts`));
    const unsubAlerts = onSnapshot(alertsQuery, (snap) => {
      const alertList: CafeAlert[] = [];
      const currentAlertIds = new Set<string>();

      snap.forEach(d => {
        const data = { id: d.id, ...d.data() } as CafeAlert;
        alertList.push(data);
        currentAlertIds.add(d.id);

        if (!isFirstAlertsSnapshot.current && !previousAlertIds.current.has(d.id) && !data.resolved) {
          if (soundEnabled) {
            playWaiterAlertSound();
          }
        }
      });

      alertList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setAlerts(alertList);

      previousAlertIds.current = currentAlertIds;
      isFirstAlertsSnapshot.current = false;
    }, (err) => {
      console.warn('Alerts snapshot error:', err);
    });

    // 6. Real-time Bills listener
    const unsubBills = onSnapshot(collection(db, `cafes/${cafeId}/bills`), (snap) => {
      const billList: Bill[] = [];
      snap.forEach(d => billList.push({ id: d.id, ...d.data() } as Bill));
      setBills(billList);
    }, (err) => {
      console.warn('Bills snapshot error:', err);
    });

    return () => {
      unsubCafe();
      unsubTables();
      unsubOrders();
      unsubAlerts();
      unsubBills();
    };
  }, [cafeId, soundEnabled]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-100 space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-stone-400">Loading cafe workspace...</p>
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-100 p-4">
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl max-w-md text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold font-serif">Cafe Not Found</h2>
          <p className="text-xs text-stone-400">
            The requested cafe identifier ({cafeId}) does not exist in the database or has been removed.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Link to="/admin" className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs">
              Go to Super Admin
            </Link>
            <Link to="/" className="px-4 py-2 rounded-xl bg-stone-800 text-stone-200 text-xs">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeOrdersCount = orders.filter(o => ['New', 'Accepted', 'Preparing', 'Ready'].includes(o.status)).length;
  const newOrdersCount = orders.filter(o => o.status === 'New').length;
  const unresolvedAlertCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Cafe Dashboard Top Bar */}
      <header className="border-b border-stone-800 bg-stone-900/95 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Cafe Identity */}
          <div className="flex items-center gap-3">
            {cafe.logoUrl ? (
              <img src={cafe.logoUrl} alt={cafe.name} className="w-10 h-10 object-cover rounded-xl border border-stone-700" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center font-bold text-amber-400">
                {cafe.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-serif text-stone-100">{cafe.name}</h1>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-800 font-semibold">
                  ● Live Sync
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                {userProfile?.name || cafe.ownerName} • {cafe.address}
              </p>
            </div>
          </div>

          {/* Quick Actions & Sound */}
          <div className="flex items-center gap-2">
            {/* Audio Bell Mute/Unmute */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
                soundEnabled
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-stone-800 text-stone-500 border-stone-700'
              }`}
              title={soundEnabled ? 'Kitchen order chime is enabled' : 'Kitchen chime muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Order Preview (opens first table) */}
            <a
              href={`/order/${cafe.id}/${tables[0]?.id || 'T1'}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-semibold border border-stone-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" /> Customer QR View
            </a>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-stone-800 pt-2 text-xs">
          {/* Live Orders */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
            }`}
          >
            <ChefHat className="w-4 h-4" /> Live Orders
            {activeOrdersCount > 0 && (
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'orders' ? 'bg-stone-950 text-amber-400' : 'bg-amber-500 text-stone-950'
              }`}>
                {activeOrdersCount}
              </span>
            )}
            {unresolvedAlertCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>

          {/* Tables */}
          {canManageTables && (
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'tables'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <Layers className="w-4 h-4" /> Tables & QR ({tables.length})
            </button>
          )}

          {/* Menu */}
          {canManageMenu && (
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'menu'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <Utensils className="w-4 h-4" /> Menu ({menuItems.length})
            </button>
          )}

          {/* Billing */}
          {canViewBilling && (
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'billing'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <Receipt className="w-4 h-4" /> Billing & POS
            </button>
          )}

          {/* Sales */}
          {canViewBilling && (
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Sales Analytics
            </button>
          )}

          {/* Settings */}
          {canManageSettings && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          )}
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {activeTab === 'orders' && (
          <LiveOrdersTab
            cafeId={cafe.id}
            orders={orders}
            alerts={alerts}
            settings={cafe.settings}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
          />
        )}

        {activeTab === 'tables' && canManageTables && (
          <TablesTab
            cafeId={cafe.id}
            cafeName={cafe.name}
            tables={tables}
            orders={orders}
          />
        )}

        {activeTab === 'menu' && canManageMenu && (
          <MenuTab
            cafeId={cafe.id}
            categories={categories}
          />
        )}

        {activeTab === 'billing' && canViewBilling && (
          <BillingTab
            cafeId={cafe.id}
            cafeName={cafe.name}
            tables={tables}
            orders={orders}
            bills={bills}
            settings={cafe.settings}
          />
        )}

        {activeTab === 'sales' && canViewBilling && (
          <SalesTab
            cafeId={cafe.id}
            orders={orders}
            bills={bills}
            settings={cafe.settings}
          />
        )}

        {activeTab === 'settings' && canManageSettings && (
          <SettingsTab
            cafeId={cafe.id}
            cafe={cafe}
            settings={cafe.settings}
            onRefresh={() => loadMenuData(cafe.id)}
          />
        )}
      </main>
    </div>
  );
};
