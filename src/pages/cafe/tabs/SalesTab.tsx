import React, { useState, useMemo } from 'react';
import { Bill, CafeSettings, Order } from '../../../types';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Award,
  Download,
  Calendar,
  Grid,
  Percent
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Props {
  cafeId: string;
  bills: Bill[];
  orders: Order[];
  settings: CafeSettings;
}

export const SalesTab: React.FC<Props> = ({ bills, orders, settings }) => {
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const currency = settings.currency || '$';

  // Filter bills based on selected time range
  const filteredBills = useMemo(() => {
    const now = new Date();
    return bills.filter(b => {
      if (!b.createdAt) return true;
      const billDate = new Date(b.createdAt);
      if (timeRange === 'today') {
        return billDate.toDateString() === now.toDateString();
      }
      if (timeRange === '7d') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return billDate >= past7;
      }
      if (timeRange === '30d') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return billDate >= past30;
      }
      return true;
    });
  }, [bills, timeRange]);

  // Overall metrics
  const totalRevenue = filteredBills.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalBillsCount = filteredBills.length;
  const averageOrderValue = totalBillsCount > 0 ? totalRevenue / totalBillsCount : 0;
  const totalTaxCollected = filteredBills.reduce((sum, b) => sum + (b.tax || 0), 0);

  // Payment Breakdown
  const paymentBreakdown: Record<string, number> = { UPI: 0, Card: 0, Cash: 0 };
  filteredBills.forEach(b => {
    if (b.paymentMethod) {
      paymentBreakdown[b.paymentMethod] = (paymentBreakdown[b.paymentMethod] || 0) + (b.total || 0);
    }
  });

  const pieData = Object.entries(paymentBreakdown)
    .filter(([, val]) => val > 0)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899'];

  // Top Selling Dishes
  const itemCounts: Record<string, { qty: number; revenue: number }> = {};
  filteredBills.forEach(b => {
    b.itemsSummary?.forEach((it: { name: string; qty: number; total: number }) => {
      if (!itemCounts[it.name]) itemCounts[it.name] = { qty: 0, revenue: 0 };
      itemCounts[it.name].qty += it.qty;
      itemCounts[it.name].revenue += it.total;
    });
  });

  const topDishes = Object.entries(itemCounts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Hourly Revenue from actual bills
  const hourlyData = useMemo(() => {
    const hoursMap: Record<number, number> = {};
    for (let h = 8; h <= 22; h += 2) {
      hoursMap[h] = 0;
    }

    filteredBills.forEach(b => {
      if (!b.createdAt) return;
      const h = new Date(b.createdAt).getHours();
      // Bucket into nearest even hour
      const bucket = Math.max(8, Math.min(22, Math.floor(h / 2) * 2));
      hoursMap[bucket] = (hoursMap[bucket] || 0) + (b.total || 0);
    });

    return Object.entries(hoursMap).map(([hourStr, rev]) => {
      const h = parseInt(hourStr, 10);
      const label = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
      return {
        hour: label,
        revenue: Number(rev.toFixed(2))
      };
    });
  }, [filteredBills]);

  // Table Performance & Turnover
  const tableStats = useMemo(() => {
    const map: Record<string, { label: string; count: number; revenue: number }> = {};
    filteredBills.forEach(b => {
      const key = b.tableId || 'unknown';
      const label = b.tableLabel || `Table ${key}`;
      if (!map[key]) map[key] = { label, count: 0, revenue: 0 };
      map[key].count += 1;
      map[key].revenue += b.total || 0;
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBills]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredBills.length === 0) {
      alert('No bill records available to export.');
      return;
    }

    const headers = ['Bill ID', 'Table', 'Date Time', 'Payment Method', 'Subtotal', 'Tax', 'Service Fee', 'Grand Total'];
    const rows = filteredBills.map(b => [
      b.id,
      `"${b.tableLabel}"`,
      new Date(b.createdAt).toLocaleString(),
      b.paymentMethod,
      b.subtotal.toFixed(2),
      b.tax.toFixed(2),
      b.serviceCharge.toFixed(2),
      b.total.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cafe-sales-report-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Time Filter and Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" /> Sales & Revenue Intelligence
          </h2>
          <p className="text-xs text-stone-400">
            Real-time analytics computed from settled table bills and completed orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range buttons */}
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'all', label: 'All Time' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  timeRange === tab.id
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-serif text-stone-100">
            {currency}{totalRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-stone-400">
            {filteredBills.length} settled tickets
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Bills Settled
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-serif text-stone-100">
            {totalBillsCount}
          </div>
          <span className="text-[11px] text-stone-400">
            Across dining tables
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Average Bill (AOV)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-serif text-stone-100">
            {currency}{averageOrderValue.toFixed(2)}
          </div>
          <span className="text-[11px] text-stone-400">
            Avg revenue per guest group
          </span>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Taxes Collected
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-serif text-stone-100">
            {currency}{totalTaxCollected.toFixed(2)}
          </div>
          <span className="text-[11px] text-stone-400">
            GST / Sales tax collected
          </span>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Revenue Velocity */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-mono">
            Hourly Revenue Velocity
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis dataKey="hour" stroke="#78716c" fontSize={11} />
                <YAxis stroke="#78716c" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', color: '#f5f5f4' }}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-mono">
            Payment Method Breakdown
          </h3>
          <div className="h-48 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name || ''} ${percent ? (percent * 100).toFixed(0) : '0'}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', color: '#f5f5f4' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-stone-500">No settled payments recorded yet.</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-stone-800">
            {Object.entries(paymentBreakdown).map(([name, val]) => (
              <div key={name} className="p-2 bg-stone-950 rounded-xl border border-stone-800">
                <span className="text-[10px] text-stone-400 block">{name}</span>
                <span className="font-bold text-stone-200">{currency}{val.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Best-Selling Items & Table Turnover */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Best-Selling Items */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Best-Selling Menu Items
          </h3>

          {topDishes.length === 0 ? (
            <div className="p-6 text-center text-stone-500 text-xs">
              Complete orders to populate the dish popularity ranking.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topDishes.map((dish, idx) => (
                <div
                  key={dish.name}
                  className="bg-stone-950 border border-stone-800 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-200">{dish.name}</h4>
                      <span className="text-[10px] text-stone-400">{dish.qty} servings ordered</span>
                    </div>
                  </div>

                  <span className="font-mono text-amber-400 font-bold">
                    {currency}{dish.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table Turnover & Performance */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Grid className="w-4 h-4 text-amber-400" /> Table Performance & Turnover
          </h3>

          {tableStats.length === 0 ? (
            <div className="p-6 text-center text-stone-500 text-xs">
              Settle table bills to view seating performance metrics.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {tableStats.map(stat => (
                <div
                  key={stat.label}
                  className="bg-stone-950 border border-stone-800 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-stone-200">{stat.label}</h4>
                    <span className="text-[10px] text-stone-400">
                      {stat.count} checkout{stat.count === 1 ? '' : 's'} • Avg {currency}
                      {(stat.revenue / stat.count).toFixed(2)}
                    </span>
                  </div>

                  <span className="font-mono text-emerald-400 font-bold">
                    {currency}{stat.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
