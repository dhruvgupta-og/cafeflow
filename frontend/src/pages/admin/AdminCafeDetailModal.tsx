import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Cafe, Table, Order, Bill } from '../../types';
import { CafeStatusBadge, PlanBadge } from '../../components/common/StatusBadge';
import { X, ExternalLink, Calendar, MapPin, Mail, Phone, ShoppingBag, DollarSign, LayoutGrid, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  cafe: Cafe | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCafeDetailModal: React.FC<Props> = ({ cafe, isOpen, onClose }) => {
  const navigate = useNavigate();
  const {} = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cafe || !isOpen) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [tablesSnap, ordersSnap, billsSnap] = await Promise.all([
          getDocs(collection(db, `cafes/${cafe.id}/tables`)),
          getDocs(collection(db, `cafes/${cafe.id}/orders`)),
          getDocs(collection(db, `cafes/${cafe.id}/bills`))
        ]);

        setTables(tablesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Table)));
        setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setBills(billsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)));
      } catch (err) {
        console.error('Error fetching cafe detail stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [cafe, isOpen]);

  if (!isOpen || !cafe) return null;

  const totalRevenue = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + (b.total || 0), 0);

  const occupiedTables = tables.filter(t => t.status === 'occupied').length;

  const lastActiveDate = orders.length > 0
    ? new Date(Math.max(...orders.map(o => new Date(o.createdAt || 0).getTime()))).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'No orders yet';



  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl text-stone-100 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-stone-950/80 border-b border-stone-800 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {cafe.logoUrl ? (
              <img src={cafe.logoUrl} alt={cafe.name} className="w-14 h-14 object-cover rounded-xl border border-stone-700" />
            ) : (
              <div className="w-14 h-14 bg-amber-950 border border-amber-800 rounded-xl flex items-center justify-center text-amber-400 font-bold text-xl">
                {cafe.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold font-serif text-stone-100">{cafe.name}</h3>
                <CafeStatusBadge status={cafe.status} />
                <PlanBadge plan={cafe.plan} />
              </div>
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-500" /> {cafe.address}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Revenue
              </span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {cafe.settings.currency}{totalRevenue.toFixed(2)}
              </p>
            </div>

            <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" /> Orders
              </span>
              <p className="text-xl font-bold text-stone-100 mt-1">
                {orders.length}
              </p>
            </div>

            <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5 text-sky-400" /> Tables
              </span>
              <p className="text-xl font-bold text-stone-100 mt-1">
                {tables.length} <span className="text-xs font-normal text-stone-400">({occupiedTables} active)</span>
              </p>
            </div>

            <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
              <span className="text-[11px] font-medium text-stone-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> Last Active
              </span>
              <p className="text-xs font-medium text-stone-200 mt-1.5 truncate">
                {lastActiveDate}
              </p>
            </div>
          </div>

          {/* Contact and Config Details */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-stone-400 block mb-0.5">Owner</span>
                <span className="text-stone-100 font-medium">{cafe.ownerName}</span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5">Email</span>
                <span className="text-stone-100 font-medium">{cafe.email}</span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5">Phone</span>
                <span className="text-stone-100 font-medium">{cafe.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5">Joined Date</span>
                <span className="text-stone-100 font-medium">{new Date(cafe.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5">Tax & Service</span>
                <span className="text-stone-100 font-medium">{cafe.settings.taxPercent}% Tax | {cafe.settings.serviceChargePercent}% Service</span>
              </div>
              <div>
                <span className="text-stone-400 block mb-0.5">Opening Hours</span>
                <span className="text-stone-100 font-medium">{cafe.settings.openingHours}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800">
            <button
              onClick={() => {
                if (tables.length > 0) {
                  navigate(`/order/${cafe.id}/${tables[0].id}`);
                } else {
                  navigate(`/order/${cafe.id}/T1`);
                }
              }}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Preview Customer Menu
            </button>


          </div>
        </div>
      </div>
    </div>
  );
};
