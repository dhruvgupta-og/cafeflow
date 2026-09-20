import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Coffee, QrCode, LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { seedDemoDataIfNeeded } from '../../lib/seed';

export const DemoRoleBanner: React.FC = () => {
  const { userProfile, impersonateRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // If viewing customer ordering page in kiosk or full screen mode, show compact view
  const isCustomerRoute = location.pathname.startsWith('/order/');

  const handleSeed = async () => {
    setSeeding(true);
    await seedDemoDataIfNeeded();
    setSeeding(false);
    window.location.reload();
  };

  return (
    <div className="bg-stone-900 text-stone-200 text-xs px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 z-50 sticky top-0 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
          <Sparkles className="w-3 h-3" /> CafeFlow Quick Switcher
        </span>
        <span className="hidden sm:inline text-stone-400">
          Current Role: <strong className="text-stone-100 uppercase tracking-wide">{userProfile?.role || 'Guest / Customer'}</strong>
          {userProfile?.cafeId && <span className="text-amber-400/90 ml-1">({userProfile.cafeId})</span>}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => {
            impersonateRole('platform_admin');
            navigate('/admin');
          }}
          className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
            location.pathname.startsWith('/admin')
              ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
        >
          <Shield className="w-3 h-3" /> Super Admin
        </button>

        <button
          onClick={() => {
            impersonateRole('cafe_owner', 'cafe-velvet-roast', 'elena@velvetroast.com');
            navigate('/cafe/cafe-velvet-roast');
          }}
          className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
            location.pathname.startsWith('/cafe/cafe-velvet-roast')
              ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
        >
          <Coffee className="w-3 h-3" /> Velvet Roast Staff
        </button>

        <button
          onClick={() => {
            impersonateRole('cafe_owner', 'cafe-matcha-haven', 'kenji@matchahaven.com');
            navigate('/cafe/cafe-matcha-haven');
          }}
          className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
            location.pathname.startsWith('/cafe/cafe-matcha-haven')
              ? 'bg-amber-500 text-stone-950 shadow-sm font-semibold'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
        >
          <Coffee className="w-3 h-3" /> Matcha Haven Staff
        </button>

        <button
          onClick={() => navigate('/order/cafe-velvet-roast/T2')}
          className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1 ${
            location.pathname === '/order/cafe-velvet-roast/T2'
              ? 'bg-emerald-500 text-stone-950 shadow-sm font-semibold'
              : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/90'
          }`}
        >
          <QrCode className="w-3 h-3" /> Table 2 Customer View
        </button>

        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 ml-1 border border-stone-700"
          title="Reset or re-seed sample cafes & live menu"
        >
          {seeding ? 'Seeding...' : '↻ Reset Demo Data'}
        </button>

        {userProfile && (
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="p-1 rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
