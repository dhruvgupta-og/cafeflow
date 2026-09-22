import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Cafe, CafePlan } from '../../types';
import { createCafeInvitation, getInviteUrl } from '../../lib/invitations';
import { getPlanConfig } from '../../lib/plans';
import { X, Copy, Check, Sparkles, Building2, ShieldAlert, Mail, Coffee } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCafe: Cafe) => void;
  onOpenInviteModal?: (cafe: Cafe) => void;
}

const PRESET_LOGOS = [
  { label: 'Artisan Espresso', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80' },
  { label: 'Green Teahouse', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=200&auto=format&fit=crop&q=80' },
  { label: 'Cozy Bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop&q=80' },
  { label: 'Modern Bistro', url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200&auto=format&fit=crop&q=80' }
];

export const AdminAddCafeModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, onOpenInviteModal }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<CafePlan>('Pro');
  const [logoUrl, setLogoUrl] = useState(PRESET_LOGOS[0].url);
  const [openingHours, setOpeningHours] = useState('7:30 AM - 9:00 PM');
  const [currency, setCurrency] = useState('₹');
  const [taxPercent, setTaxPercent] = useState<number>(8.0);
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(5.0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    cafeId: string;
    cafeName: string;
    ownerEmail: string;
    tempPass: string;
    dashboardUrl: string;
    inviteUrl: string;
    cafe: Cafe;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Call Cloud Function to provision cafe and owner account securely
      const createCafeAndOwnerFn = httpsCallable(functions, 'createCafeAndOwner');
      const result = await createCafeAndOwnerFn({
        cafeName: name,
        address,
        ownerName,
        ownerEmail: email,
        phone,
        logoUrl,
        plan,
        currency: currency || '₹',
        taxPercent: Number(taxPercent) || 0,
        serviceChargePercent: Number(serviceChargePercent) || 0,
        openingHours: openingHours || '8:00 AM - 8:00 PM',
      });

      const { cafeId, tempPassword } = result.data as any;

      // 2. Fetch the newly created cafe document to pass back to the UI
      const cafeSnap = await getDoc(doc(db, 'cafes', cafeId));
      const newCafe = { id: cafeId, ...cafeSnap.data() } as Cafe;

      // 3. Generate Invitation Token & link for owner onboarding
      let inviteUrl = '';
      try {
        const inv = await createCafeInvitation(newCafe);
        inviteUrl = getInviteUrl(inv.token);
      } catch (invErr) {
        console.warn('Invitation creation note:', invErr);
      }

      const dashUrl = `${window.location.origin}/cafe/${cafeId}`;
      setCreatedCredentials({
        cafeId,
        cafeName: name,
        ownerEmail: email,
        tempPass: tempPassword,
        dashboardUrl: dashUrl,
        inviteUrl,
        cafe: newCafe
      });

      onSuccess(newCafe);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create cafe document');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Cafe: ${createdCredentials.cafeName}\nDashboard: ${createdCredentials.dashboardUrl}\nEmail: ${createdCredentials.ownerEmail}\nTemporary Password: ${createdCredentials.tempPass}\nOwner Invitation Link: ${createdCredentials.inviteUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyInviteOnly = () => {
    if (!createdCredentials?.inviteUrl) return;
    navigator.clipboard.writeText(createdCredentials.inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const planConfig = getPlanConfig(plan);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl text-stone-100 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-stone-100">Provision New Tenant Cafe</h3>
              <p className="text-xs text-stone-400">Creates isolated Firestore records, plan limits & owner invite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {createdCredentials ? (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200">
                <div className="flex items-center gap-2 font-semibold text-emerald-400 text-sm mb-1">
                  <Sparkles className="w-4 h-4" /> Cafe & Owner Account Successfully Provisioned!
                </div>
                <p className="text-xs text-emerald-300">
                  The cafe workspace and owner invitation link have been created. You can share credentials or dispatch the invite email.
                </p>
              </div>

              <div className="bg-stone-950 rounded-xl p-5 border border-stone-800 space-y-3 font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Cafe ID:</span>
                  <span className="text-amber-300 font-semibold">{createdCredentials.cafeId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Cafe Name:</span>
                  <span className="text-stone-100 font-medium">{createdCredentials.cafeName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Subscription Plan:</span>
                  <span className="text-amber-400 font-bold">{planConfig.displayName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Owner Login Email:</span>
                  <span className="text-sky-300">{createdCredentials.ownerEmail}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Temporary Password:</span>
                  <span className="text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                    {createdCredentials.tempPass}
                  </span>
                </div>
                {createdCredentials.inviteUrl && (
                  <div className="flex flex-col gap-1 pt-1 border-b border-stone-800 pb-2">
                    <span className="text-stone-400">Owner Invitation Link (Password Setup):</span>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        readOnly
                        value={createdCredentials.inviteUrl}
                        className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-[11px] text-amber-300 select-all"
                      />
                      <button
                        onClick={copyInviteOnly}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs flex items-center gap-1 shrink-0"
                      >
                        {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedInvite ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-stone-400">Direct Dashboard URL:</span>
                  <a
                    href={createdCredentials.dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 underline break-all hover:text-amber-300"
                  >
                    {createdCredentials.dashboardUrl}
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={copyCredentials}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Credentials Copied!' : 'Copy All Login & Invite Details'}
                </button>

                {onOpenInviteModal && (
                  <button
                    onClick={() => {
                      onOpenInviteModal(createdCredentials.cafe);
                      onClose();
                    }}
                    className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold text-xs flex items-center gap-1.5 border border-stone-700 transition"
                  >
                    <Mail className="w-4 h-4" /> Preview Email Dispatch
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cafe Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Cafe Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hearth & Brew Artisanal Cafe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 102 Pine Street, Suite B"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Owner Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus Vance"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Owner Email */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Owner Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    placeholder="marcus@hearthbrew.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 987-6543"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Plan Tier */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Subscription Plan Tier *</label>
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

                {/* Tax & Service charge */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Tax Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
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
                    min="0"
                    value={serviceChargePercent}
                    onChange={(e) => setServiceChargePercent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Logo Preset / Custom */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Cafe Logo / Theme Image</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {PRESET_LOGOS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLogoUrl(p.url)}
                        className={`p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition ${
                          logoUrl === p.url ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400' : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                        }`}
                      >
                        <img src={p.url} alt={p.label} className="w-10 h-10 object-cover rounded-md" />
                        <span className="text-[10px] text-stone-400 truncate w-full text-center">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="url"
                    placeholder="Or enter custom image URL"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
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
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Creating Cafe & Owner Invite...' : 'Provision Cafe & Generate Invitation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
