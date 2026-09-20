import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Cafe, CafePlan, CafeStatus } from '../../types';
import { X, Building2, Save, ShieldAlert } from 'lucide-react';

interface Props {
  cafe: Cafe | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedCafe: Cafe) => void;
}

export const AdminEditCafeModal: React.FC<Props> = ({ cafe, isOpen, onClose, onUpdated }) => {
  if (!isOpen || !cafe) return null;

  const [name, setName] = useState(cafe.name);
  const [address, setAddress] = useState(cafe.address);
  const [ownerName, setOwnerName] = useState(cafe.ownerName);
  const [email, setEmail] = useState(cafe.email);
  const [phone, setPhone] = useState(cafe.phone);
  const [plan, setPlan] = useState<CafePlan>(cafe.plan);
  const [status, setStatus] = useState<CafeStatus>(cafe.status);
  const [taxPercent, setTaxPercent] = useState<number>(cafe.settings.taxPercent);
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(cafe.settings.serviceChargePercent);
  const [openingHours, setOpeningHours] = useState(cafe.settings.openingHours);
  const [currency, setCurrency] = useState(cafe.settings.currency);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const updatedData: Partial<Cafe> = {
        name,
        address,
        ownerName,
        email,
        phone,
        plan,
        status,
        settings: {
          taxPercent: Number(taxPercent) || 0,
          serviceChargePercent: Number(serviceChargePercent) || 0,
          currency: currency || '$',
          openingHours
        }
      };

      await updateDoc(doc(db, 'cafes', cafe.id), updatedData);
      onUpdated({ ...cafe, ...updatedData } as Cafe);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update cafe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl text-stone-100 shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold font-serif">Edit Cafe: {cafe.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-300 mb-1">Cafe Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-300 mb-1">Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Owner Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Subscription Plan Tier</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as CafePlan)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="Starter">Starter / Basic ($19/mo • Max 8 Tables)</option>
                <option value="Pro">Pro ($49/mo • Max 30 Tables • Live Chimes)</option>
                <option value="Enterprise">Enterprise / Premium ($129/mo • Unlimited Tables)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CafeStatus)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Tax (%)</label>
              <input
                type="number"
                step="0.1"
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Service Charge (%)</label>
              <input
                type="number"
                step="0.1"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
