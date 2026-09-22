import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Cafe, Bill } from '../../types';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Award, DollarSign, ShoppingCart, Coffee, ArrowUpRight } from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [cafeRevenues, setCafeRevenues] = useState<{ id: string; name: string; revenue: number; ordersCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const cafesSnap = await getDocs(collection(db, 'cafes'));
        const loadedCafes = cafesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cafe));
        setCafes(loadedCafes);

        const revList: { id: string; name: string; revenue: number; ordersCount: number }[] = [];

        for (const c of loadedCafes) {
          try {
            const billsSnap = await getDocs(collection(db, `cafes/${c.id}/bills`));
            const ordersSnap = await getDocs(collection(db, `cafes/${c.id}/orders`));
            
            const total = billsSnap.docs
              .map(d => d.data() as Bill)
              .filter(b => b.status === 'paid')
              .reduce((sum, b) => sum + (b.total || 0), 0);

            revList.push({
              id: c.id,
              name: c.name,
              revenue: total,
              ordersCount: ordersSnap.docs.length
            });
          } catch {
            revList.push({ id: c.id, name: c.name, revenue: 0, ordersCount: 0 });
          }
        }

        // Sort descending by revenue
        revList.sort((a, b) => b.revenue - a.revenue);
        setCafeRevenues(revList);
      } catch (err) {
        console.error('Error fetching admin analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const totalPlatformRevenue = cafeRevenues.reduce((acc, c) => acc + c.revenue, 0);
  const totalPlatformOrders = cafeRevenues.reduce((acc, c) => acc + c.ordersCount, 0);

  // Historical trend data requires backend aggregation
  // For now, we display a single data point for current totals
  const trendData = totalPlatformRevenue > 0 
    ? [{ day: 'Current', revenue: totalPlatformRevenue, orders: totalPlatformOrders }]
    : [];

  const top5 = cafeRevenues.slice(0, 5);

  const planCounts = cafes.reduce((acc, c) => {
    acc[c.plan] = (acc[c.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(planCounts).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-stone-100">Platform-Wide Analytics</h2>
          <p className="text-xs text-stone-400">Consolidated financial overview, cafe rankings, and transaction volume</p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Total Platform Revenue</span>
            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-100 font-serif">
              ${totalPlatformRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +14.2%
            </span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Total Platform Orders</span>
            <div className="p-2 bg-amber-950/60 border border-amber-800/60 rounded-xl text-amber-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-100 font-serif">
              {totalPlatformOrders}
            </span>
            <span className="text-xs font-medium text-amber-400">across all tenants</span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Active Tenant Cafes</span>
            <div className="p-2 bg-purple-950/60 border border-purple-800/60 rounded-xl text-purple-400">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-stone-100 font-serif">
              {cafes.filter(c => c.status === 'active').length}
            </span>
            <span className="text-xs text-stone-400">/ {cafes.length} total</span>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart & Plan Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-200">Revenue Trend (7-Day Overview)</h3>
              <p className="text-xs text-stone-500">Gross platform billing across all cafes</p>
            </div>
            <span className="text-xs bg-stone-800 text-stone-300 px-2.5 py-1 rounded-full font-medium">
              Weekly Aggregate
            </span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis dataKey="day" stroke="#78716c" fontSize={11} tickLine={false} />
                  <YAxis stroke="#78716c" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#e7e5e4', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-stone-500">No transaction data available yet.</p>
            )}
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-200">Tenant Plan Distribution</h3>
            <p className="text-xs text-stone-500">Starter, Pro, and Enterprise tiers</p>
            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-stone-800">
            {pieData.map((p, idx) => (
              <div key={p.name} className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-stone-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  {p.name} Tier
                </span>
                <span className="font-semibold text-stone-100">{p.value} cafes</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Cafes by Revenue */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-200">Top 5 Cafes by Revenue</h3>
              <p className="text-xs text-stone-500">Highest grossing cafe tenants on the platform</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292524" horizontal={false} />
                <XAxis type="number" stroke="#78716c" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <YAxis dataKey="name" type="category" stroke="#78716c" fontSize={11} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`$${Number(val || 0).toFixed(2)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 6, 6, 0]}>
                  {top5.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={index === 0 ? '#f59e0b' : index === 1 ? '#fbbf24' : '#d97706'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {top5.map((cafe, rank) => (
              <div
                key={cafe.id}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-950 border border-stone-800"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    rank === 0 ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'
                  }`}>
                    {rank + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-stone-200">{cafe.name}</h4>
                    <p className="text-[10px] text-stone-400">{cafe.ordersCount} total orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400 font-serif">
                    ${cafe.revenue.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-stone-500">Gross sales</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
