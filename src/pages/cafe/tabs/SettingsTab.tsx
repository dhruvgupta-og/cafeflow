import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Cafe, CafeSettings } from '../../../types';
import {
  Settings,
  Store,
  DollarSign,
  Clock,
  Save,
  CheckCircle2,
  Sliders,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

interface Props {
  cafeId: string;
  cafe: Cafe;
  settings: CafeSettings;
  onRefresh?: () => void;
}

export const SettingsTab: React.FC<Props> = ({ cafeId, cafe, settings }) => {
  // Cafe profile
  const [name, setName] = useState(cafe.name);
  const [address, setAddress] = useState(cafe.address);
  const [phone, setPhone] = useState(cafe.phone);
  const [logoUrl, setLogoUrl] = useState(cafe.logoUrl || '');

  // Financial configuration
  const [currency, setCurrency] = useState(settings.currency || '$');
  const [taxPercent, setTaxPercent] = useState(settings.taxPercent ?? 8.5);
  const [serviceChargePercent, setServiceChargePercent] = useState(settings.serviceChargePercent ?? 5.0);
  const [openingHours, setOpeningHours] = useState(settings.openingHours || '7:00 AM - 10:00 PM');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const updatedSettings: CafeSettings = {
        currency,
        taxPercent: Number(taxPercent),
        serviceChargePercent: Number(serviceChargePercent),
        openingHours
      };

      await updateDoc(doc(db, 'cafes', cafeId), {
        name,
        address,
        phone,
        logoUrl,
        settings: updatedSettings
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" /> Cafe Configuration & Financial Policies
          </h2>
          <p className="text-xs text-stone-400">
            Configure restaurant identity, GST/Sales taxes, and POS service charges.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4" />
          <span>Cafe settings and tax configuration successfully saved!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Restaurant Identity */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400" /> Restaurant Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">
                Cafe Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">
              Physical Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">
              Brand Logo URL (Displayed on Customer QR Menu)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Financial & Tax Configuration */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" /> POS Financial Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">
                Sales Tax / GST Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1">
                Service Charge Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">
              Standard Operating Hours
            </label>
            <input
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="e.g. 7:00 AM - 10:00 PM"
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
