import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Cafe } from '../types';
import { seedInitialDemoData } from '../lib/seed';
import {
  Coffee,
  Shield,
  Smartphone,
  ChefHat,
  Receipt,
  QrCode,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const { impersonateRole } = useAuth();
  const navigate = useNavigate();

  const loadCafes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'cafes'));
      const list: Cafe[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Cafe));
      setCafes(list);
    } catch (err) {
      console.error('Error fetching cafes on landing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCafes();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedInitialDemoData(true);
      setSeedSuccess(true);
      await loadCafes();
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (err) {
      console.error('Seeding error:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleQuickLaunchStaff = (cafeId: string, email: string) => {
    impersonateRole('cafe_owner', cafeId, email);
    navigate(`/cafe/${cafeId}`);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navigation */}
      <nav className="border-b border-stone-800/80 bg-stone-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20 font-bold">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <span className="font-serif font-black text-xl tracking-tight text-stone-100">
                Cafe<span className="text-amber-400">Flow</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-widest">
                Multi-Tenant Operating System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition"
              title="Reset and seed rich demo cafes, tables, and menus"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              {seeding ? 'Seeding...' : 'Seed Demo Data'}
            </button>

            <Link
              to="/admin"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-md transition"
            >
              <Shield className="w-4 h-4" /> Super Admin Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
        {seedSuccess && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs flex items-center justify-center gap-2 animate-fadeIn shadow-lg">
            <CheckCircle2 className="w-4 h-4" />
            <span>Database successfully seeded with demo cafes & menus!</span>
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Next-Gen Cloud Cafe Architecture (Firestore + Auth)
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-serif tracking-tight text-stone-100 max-w-4xl mx-auto leading-tight">
          One Shared Database.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
            Infinite Independent Cafes.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-stone-400 max-w-2xl mx-auto leading-relaxed">
          CafeFlow connects platform administrators, kitchen staff, and dining guests in real time with dynamic table QR codes, instant kitchen displays, and POS settlements.
        </p>
      </section>

      {/* The 3 Core Portals Bento Grid */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-xs uppercase font-bold text-stone-400 tracking-widest text-center mb-6">
          Explore The 3 Distinct Integrated Portals
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Super Admin Panel */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl hover:border-amber-500/50 transition duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Portal 1 • Route /admin
              </span>
              <h3 className="text-xl font-bold font-serif text-stone-100 mt-1 mb-2">
                Super Admin Panel
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                Platform-wide control center for onboarding cafes, generating owner credentials, managing subscription tiers, and viewing aggregate revenue analytics.
              </p>

              <ul className="space-y-2 text-xs text-stone-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Provision new cafe instances in Firestore
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Suspend, reactivate, or delete tenants
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Platform gross volume & plan distribution
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-800">
              <Link
                to="/admin"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                Launch Super Admin <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 2. Cafe Staff Dashboard */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl hover:border-amber-500/50 transition duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <ChefHat className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                Portal 2 • Route /cafe/:cafeId
              </span>
              <h3 className="text-xl font-bold font-serif text-stone-100 mt-1 mb-2">
                Cafe Kitchen & POS Dashboard
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                Dedicated management portal for cafe staff with real-time kitchen ticket listeners, audio chime notifications, QR generator, and billing settlement.
              </p>

              <ul className="space-y-2 text-xs text-stone-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Live order status progression (New &rarr; Served)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Table QR codes + Standee printable cards
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Menu engineering & 1-click availability toggles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Combined table billing & tax receipts
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-800 space-y-2">
              <button
                onClick={() => handleQuickLaunchStaff('cafe-velvet-roast', 'elena@velvetroast.com')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                Launch Velvet Roast Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3. Customer Mobile Ordering */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl hover:border-amber-500/50 transition duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Portal 3 • Route /order/:cafeId/:tableId
              </span>
              <h3 className="text-xl font-bold font-serif text-stone-100 mt-1 mb-2">
                Customer Mobile Ordering
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed mb-4">
                Zero-app-install mobile web menu for dining guests with dish customization, add-on selections, live preparation tracking, and waiter calling.
              </p>

              <ul className="space-y-2 text-xs text-stone-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Instant QR landing without mandatory login
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Real-time order progress timeline
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1-tap "Call Waiter" alert buzzer
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-800 space-y-2">
              <a
                href="/order/cafe-velvet-roast/T1"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                Open Table 1 Mobile Menu (New Tab) <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Active Tenants Directory */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold font-serif text-stone-100">Active Cafe Instances</h3>
              <p className="text-xs text-stone-400">
                Select any registered cafe below to inspect its dashboard or customer ordering flow.
              </p>
            </div>

            <button
              onClick={loadCafes}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cafes.map(c => (
              <div
                key={c.id}
                className="bg-stone-950 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between hover:border-stone-700 transition"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={c.logoUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100&auto=format&fit=crop&q=80'}
                      alt={c.name}
                      className="w-12 h-12 object-cover rounded-xl border border-stone-800"
                    />
                    <div>
                      <h4 className="font-bold text-stone-100 text-sm">{c.name}</h4>
                      <p className="text-[11px] text-stone-400">{c.address}</p>
                      <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold">
                        Plan: {c.plan}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleQuickLaunchStaff(c.id, c.email)}
                    className="flex-1 py-1.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl text-center transition"
                  >
                    Staff Portal
                  </button>

                  <a
                    href={`/order/${c.id}/T1`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-stone-950 text-xs font-bold rounded-xl flex items-center gap-1 transition"
                  >
                    Table QR <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-stone-950 py-8 text-center text-xs text-stone-400">
        <p>CafeFlow Multi-Tenant Architecture • Powered by Firebase Firestore & Authentication</p>
      </footer>
    </div>
  );
};
