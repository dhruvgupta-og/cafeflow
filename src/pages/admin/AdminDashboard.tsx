import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Cafe, CafePlan, CafeStatus, Bill, Order } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CafeStatusBadge, PlanBadge } from '../../components/common/StatusBadge';
import { AdminAddCafeModal } from './AdminAddCafeModal';
import { AdminEditCafeModal } from './AdminEditCafeModal';
import { AdminCafeDetailModal } from './AdminCafeDetailModal';
import { AdminInviteModal } from './AdminInviteModal';
import { AdminAnalytics } from './AdminAnalytics';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  Shield,
  Coffee,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  PauseCircle,
  BarChart3,
  RefreshCw,
  Mail,
  Send
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { userProfile, impersonateRole } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'cafes' | 'analytics'>('cafes');
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Stats aggregate
  const [platformStats, setPlatformStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeCafes: 0,
    suspendedCafes: 0
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
  const [detailCafe, setDetailCafe] = useState<Cafe | null>(null);
  const [inviteModalCafe, setInviteModalCafe] = useState<Cafe | null>(null);

  useEffect(() => {
    // Real-time listener for cafes collection
    const unsub = onSnapshot(collection(db, 'cafes'), async (snapshot) => {
      const cafeList: Cafe[] = [];
      snapshot.forEach((d) => {
        cafeList.push({ id: d.id, ...d.data() } as Cafe);
      });
      setCafes(cafeList);

      // Compute aggregate stats across cafes
      let totalRev = 0;
      let totalOrd = 0;
      let activeCount = 0;
      let suspendedCount = 0;

      for (const c of cafeList) {
        if (c.status === 'active') activeCount++;
        else suspendedCount++;

        try {
          const billsSnap = await getDocs(collection(db, `cafes/${c.id}/bills`));
          const ordersSnap = await getDocs(collection(db, `cafes/${c.id}/orders`));
          const paidBills = billsSnap.docs.map(d => d.data() as Bill).filter(b => b.status === 'paid');
          totalRev += paidBills.reduce((acc, b) => acc + (b.total || 0), 0);
          totalOrd += ordersSnap.docs.length;
        } catch (e) {
          // ignore error
        }
      }

      setPlatformStats({
        totalRevenue: totalRev,
        totalOrders: totalOrd,
        activeCafes: activeCount,
        suspendedCafes: suspendedCount
      });

      setLoading(false);
    }, (error) => {
      console.warn('Error loading cafes snapshot:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleToggleSuspend = async (cafe: Cafe) => {
    const nextStatus: CafeStatus = cafe.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'cafes', cafe.id), { status: nextStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteCafe = async (cafe: Cafe) => {
    if (!window.confirm(`Are you sure you want to delete "${cafe.name}" and all its records? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'cafes', cafe.id));
    } catch (err) {
      console.error('Failed to delete cafe:', err);
    }
  };

  const handleLaunchCafeDashboard = (cafe: Cafe) => {
    impersonateRole('cafe_owner', cafe.id, cafe.email);
    navigate(`/cafe/${cafe.id}`);
  };

  const filteredCafes = cafes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesPlan = planFilter === 'all' || c.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Super Admin Header */}
      <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 shadow-md shadow-amber-500/20">
              <Shield className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-serif text-stone-100">CafeFlow</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Multi-Tenant Platform Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
              <button
                onClick={() => setActiveTab('cafes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'cafes'
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Tenants ({cafes.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  activeTab === 'analytics'
                    ? 'bg-amber-500 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Analytics
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Add Cafe
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Platform Overview Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Cafes</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-serif text-stone-100 mt-2">{cafes.length}</p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-400">
              <span className="text-emerald-400">{platformStats.activeCafes} active</span>
              <span>•</span>
              <span className="text-amber-400">{platformStats.suspendedCafes} suspended</span>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Platform Orders</span>
              <ShoppingCart className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold font-serif text-stone-100 mt-2">{platformStats.totalOrders}</p>
            <p className="mt-1 text-[11px] text-stone-400">Processed across all tables</p>
          </div>

          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Platform Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-serif text-emerald-400 mt-2">
              ${platformStats.totalRevenue.toFixed(2)}
            </p>
            <p className="mt-1 text-[11px] text-stone-400">Settled and billed orders</p>
          </div>

          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">System Health</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-serif text-stone-100 mt-2">100%</p>
            <p className="mt-1 text-[11px] text-emerald-400">Real-time Firestore sync active</p>
          </div>
        </div>

        {/* Content Tabs */}
        {activeTab === 'analytics' ? (
          <AdminAnalytics />
        ) : (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Filters Bar */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 bg-stone-950/40">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search cafes by name, owner, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-stone-400">
                  <Filter className="w-3.5 h-3.5 text-stone-500" />
                  <span>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 text-xs text-stone-400">
                  <span>Plan:</span>
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Plans</option>
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cafes Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950/80 uppercase font-semibold text-[10px] text-stone-400 tracking-wider border-b border-stone-800">
                  <tr>
                    <th className="px-5 py-3.5">Cafe / Branch</th>
                    <th className="px-5 py-3.5">Owner Details</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Plan Tier</th>
                    <th className="px-5 py-3.5">Join Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-stone-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading tenant records...
                      </td>
                    </tr>
                  ) : filteredCafes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-stone-500">
                        No cafes found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCafes.map((cafe) => (
                      <tr key={cafe.id} className="hover:bg-stone-850/50 transition-colors group">
                        {/* Cafe Name & Logo */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {cafe.logoUrl ? (
                              <img
                                src={cafe.logoUrl}
                                alt={cafe.name}
                                className="w-10 h-10 object-cover rounded-lg border border-stone-700 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center font-bold text-amber-400 shrink-0">
                                {cafe.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <button
                                onClick={() => setDetailCafe(cafe)}
                                className="font-semibold text-stone-100 hover:text-amber-400 text-sm text-left flex items-center gap-1.5 transition"
                              >
                                {cafe.name}
                              </button>
                              <span className="text-[11px] text-stone-400 block truncate max-w-xs">
                                {cafe.address}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Owner Details */}
                        <td className="px-5 py-4">
                          <span className="font-medium text-stone-200 block">{cafe.ownerName}</span>
                          <span className="text-[11px] text-stone-400 block">{cafe.email}</span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <CafeStatusBadge status={cafe.status} />
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-4">
                          <PlanBadge plan={cafe.plan} />
                        </td>

                        {/* Join Date */}
                        <td className="px-5 py-4 text-stone-400">
                          {new Date(cafe.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Send / Copy Owner Invite */}
                            <button
                              onClick={() => setInviteModalCafe(cafe)}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-stone-950 text-amber-400 border border-amber-500/20 transition"
                              title="Send / Copy Owner Invitation Link"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>

                            {/* Launch Cafe Dashboard */}
                            <button
                              onClick={() => handleLaunchCafeDashboard(cafe)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-300 transition"
                              title="Open Cafe Staff Dashboard"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            {/* View Stats Modal */}
                            <button
                              onClick={() => setDetailCafe(cafe)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                              title="View Cafe Details & Stats"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Cafe */}
                            <button
                              onClick={() => setEditingCafe(cafe)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                              title="Edit Cafe Information"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Suspend / Reactivate */}
                            <button
                              onClick={() => handleToggleSuspend(cafe)}
                              className={`p-1.5 rounded-lg transition ${
                                cafe.status === 'active'
                                  ? 'bg-amber-950/60 text-amber-400 hover:bg-amber-900/80 border border-amber-800/40'
                                  : 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-800/40'
                              }`}
                              title={cafe.status === 'active' ? 'Suspend Cafe' : 'Reactivate Cafe'}
                            >
                              <PauseCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteCafe(cafe)}
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-900/80 text-stone-400 hover:text-rose-300 transition"
                              title="Delete Cafe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AdminAddCafeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onOpenInviteModal={(cafe) => setInviteModalCafe(cafe)}
        onSuccess={(newCafe) => {
          // updated via Firestore snapshot automatically
        }}
      />

      <AdminEditCafeModal
        cafe={editingCafe}
        isOpen={!!editingCafe}
        onClose={() => setEditingCafe(null)}
        onUpdated={(updated) => {
          setEditingCafe(null);
        }}
      />

      <AdminCafeDetailModal
        cafe={detailCafe}
        isOpen={!!detailCafe}
        onClose={() => setDetailCafe(null)}
      />

      <AdminInviteModal
        cafe={inviteModalCafe}
        isOpen={!!inviteModalCafe}
        onClose={() => setInviteModalCafe(null)}
      />
    </div>
  );
};
