import React, { useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Bill, CafeSettings, Order, PaymentMethod, Table, OrderItem, SelectedAddOn } from '../../../types';
import {
  Receipt,
  CheckCircle2,
  DollarSign,
  Printer,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  ArrowRight,
  Clock,
  Coffee,
  Check,
  Share2,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  cafeId: string;
  cafeName: string;
  tables: Table[];
  orders: Order[];
  bills: Bill[];
  settings: CafeSettings;
}

export const BillingTab: React.FC<Props> = ({
  cafeId,
  cafeName,
  tables,
  orders,
  bills,
  settings
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('UPI');
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);
  const [processing, setProcessing] = useState(false);

  const currency = settings.currency || '$';
  const taxPercent = settings.taxPercent ?? 8.5;
  const serviceChargePercent = settings.serviceChargePercent ?? 5.0;

  const currentTable = tables.find(t => t.id === selectedTableId) || tables[0];

  // Unsettled orders for the selected table
  const unbilledOrders = orders.filter(
    o => o.tableId === currentTable?.id && ['New', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.status)
  );

  // Group items from all unbilled orders of this table
  const allTableItems: OrderItem[] = [];
  unbilledOrders.forEach(ord => {
    ord.items.forEach(it => {
      allTableItems.push(it);
    });
  });

  // Calculate totals
  const subtotal = allTableItems.reduce((sum: number, it: OrderItem) => {
    const itemBase = it.price * it.qty;
    const addOnTotal = (it.addOns || []).reduce((aSum: number, a: SelectedAddOn) => aSum + a.price * it.qty, 0);
    return sum + itemBase + addOnTotal;
  }, 0);

  const taxAmount = (subtotal * taxPercent) / 100;
  const serviceChargeAmount = (subtotal * serviceChargePercent) / 100;
  const grandTotal = subtotal + taxAmount + serviceChargeAmount;

  // Settle Bill handler
  const handleSettleBill = async () => {
    if (unbilledOrders.length === 0 || !currentTable) return;
    setProcessing(true);

    try {
      const billId = `bill-${Date.now()}`;
      const itemsSummary = allTableItems.map(it => ({
        name: it.name,
        qty: it.qty,
        total: (it.price + (it.addOns?.reduce((s, a) => s + a.price, 0) || 0)) * it.qty
      }));

      const newBill: Bill = {
        id: billId,
        cafeId,
        tableId: currentTable.id,
        tableLabel: currentTable.label,
        orderIds: unbilledOrders.map(o => o.id),
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(taxAmount.toFixed(2)),
        serviceCharge: Number(serviceChargeAmount.toFixed(2)),
        total: Number(grandTotal.toFixed(2)),
        paymentMethod: selectedPaymentMethod,
        status: 'paid',
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        itemsSummary
      };

      // 1. Save Bill
      await setDoc(doc(db, `cafes/${cafeId}/bills`, billId), newBill);

      // 2. Mark all associated orders as 'Completed'
      for (const ord of unbilledOrders) {
        await updateDoc(doc(db, `cafes/${cafeId}/orders`, ord.id), {
          status: 'Completed',
          updatedAt: new Date().toISOString()
        });
      }

      // 3. Mark Table status back to free
      await updateDoc(doc(db, `cafes/${cafeId}/tables`, currentTable.id), {
        status: 'free'
      });

      // Show receipt & trigger celebration
      setActiveReceiptBill(newBill);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err) {
      console.error('Error settling bill:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" /> Point of Sale & Bill Settlement
          </h2>
          <p className="text-xs text-stone-400">
            Consolidate multiple orders from a table, apply taxes/service fees, and generate printable receipts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Table Picker & Unbilled Items (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Table Selector Grid */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
              Select Dining Table
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {tables.map(t => {
                const isSelected = (currentTable?.id || tables[0]?.id) === t.id;
                const hasOrders = orders.some(
                  o => o.tableId === t.id && ['New', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.status)
                );

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-stone-100 ring-1 ring-amber-500'
                        : hasOrders
                        ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className="font-bold text-xs truncate block">{t.label}</span>
                    <span className="text-[10px] mt-1 flex items-center gap-1 font-mono">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${hasOrders ? 'bg-rose-400' : 'bg-emerald-400'}`}
                      />
                      {hasOrders ? 'Active Bill' : 'Clear'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Orders on this table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-100">
                  {currentTable?.label || 'Selected Table'} • Unsettled Orders
                </h3>
                <span className="text-xs text-stone-400">
                  {unbilledOrders.length} order ticket{unbilledOrders.length === 1 ? '' : 's'} to settle
                </span>
              </div>

              {unbilledOrders.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Ready to Settle
                </span>
              )}
            </div>

            {unbilledOrders.length === 0 ? (
              <div className="p-8 text-center text-stone-500 space-y-1">
                <p className="text-xs">No active unbilled orders for this table.</p>
                <p className="text-[11px] text-stone-600">
                  Select another table or place an order from the customer ordering menu.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allTableItems.map((item, idx) => {
                  const lineTotal =
                    (item.price + (item.addOns?.reduce((s, a) => s + a.price, 0) || 0)) * item.qty;

                  return (
                    <div
                      key={idx}
                      className="bg-stone-950 p-3 rounded-xl border border-stone-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                            {item.qty}x
                          </span>
                          <span className="font-semibold text-stone-200">{item.name}</span>
                        </div>
                        {item.addOns && item.addOns.length > 0 && (
                          <div className="text-[11px] text-stone-400 pl-8 mt-0.5">
                            {item.addOns.map(a => `+ ${a.name}`).join(', ')}
                          </div>
                        )}
                      </div>

                      <span className="font-mono font-bold text-stone-200">
                        {currency}{lineTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: POS Settlement Calculation & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-300 font-mono">
              Bill Breakdown
            </h3>

            {/* Calculations table */}
            <div className="space-y-2 text-xs text-stone-300 border-b border-stone-800 pb-4">
              <div className="flex justify-between">
                <span className="text-stone-400">Items Subtotal</span>
                <span className="font-mono">{currency}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">GST / Sales Tax ({taxPercent}%)</span>
                <span className="font-mono">+{currency}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Service Charge ({serviceChargePercent}%)</span>
                <span className="font-mono">+{currency}{serviceChargeAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-bold text-stone-100">Total Payable</span>
              <span className="text-2xl font-black font-serif text-amber-400">
                {currency}{grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['UPI', 'Card', 'Cash'] as PaymentMethod[]).map(pm => {
                  const isSelected = selectedPaymentMethod === pm;
                  return (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(pm)}
                      className={`py-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow'
                          : 'bg-stone-950 text-stone-400 border-stone-700 hover:text-stone-200'
                      }`}
                    >
                      {pm === 'UPI' && <Smartphone className="w-4 h-4" />}
                      {pm === 'Card' && <CreditCard className="w-4 h-4" />}
                      {pm === 'Cash' && <Banknote className="w-4 h-4" />}
                      <span>{pm}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleSettleBill}
              disabled={unbilledOrders.length === 0 || processing}
              className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition ${
                unbilledOrders.length > 0 && !processing
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 cursor-pointer shadow-amber-500/20'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
              }`}
            >
              {processing ? (
                'Processing Settlement...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Settle & Close Table ({currency}{grandTotal.toFixed(2)})
                </>
              )}
            </button>
          </div>

          {/* Recent Bills History */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Settled Bills History ({bills.length})
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {bills.slice(0, 5).map(b => (
                <div
                  key={b.id}
                  className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 flex items-center justify-between text-xs hover:border-stone-700 transition"
                >
                  <div>
                    <span className="font-bold text-stone-200 block">{b.tableLabel}</span>
                    <span className="text-[10px] text-stone-500">
                      {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {b.paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">
                      {currency}{b.total.toFixed(2)}
                    </span>
                    <button
                      onClick={() => setActiveReceiptBill(b)}
                      className="p-1 text-stone-400 hover:text-stone-100 rounded hover:bg-stone-800"
                      title="View Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {activeReceiptBill && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold font-serif">Customer Tax Receipt</h3>
              <button
                onClick={() => setActiveReceiptBill(null)}
                className="text-stone-400 hover:text-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Paper UI */}
            <div className="bg-amber-50 text-stone-900 font-mono p-6 rounded-xl border-2 border-dashed border-stone-300 shadow-inner text-xs space-y-3">
              <div className="text-center border-b border-stone-300 pb-3">
                <h4 className="text-base font-black uppercase tracking-tight text-stone-950 font-serif">
                  {cafeName}
                </h4>
                <p className="text-[11px] text-stone-600">Official Tax Invoice</p>
                <p className="text-[10px] text-stone-500 mt-1">
                  Receipt: #{activeReceiptBill.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-[10px] text-stone-500">
                  {new Date(activeReceiptBill.createdAt).toLocaleString()}
                </p>
                <p className="text-[11px] font-bold text-stone-800 mt-1">
                  Table: {activeReceiptBill.tableLabel}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-1.5 border-b border-stone-300 pb-3">
                {activeReceiptBill.itemsSummary?.map((it: { name: string; qty: number; total: number }, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.qty}x {it.name}</span>
                    <span>{currency}{it.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Financial summary */}
              <div className="space-y-1 border-b border-stone-300 pb-3 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currency}{activeReceiptBill.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({taxPercent}%):</span>
                  <span>+{currency}{activeReceiptBill.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee ({serviceChargePercent}%):</span>
                  <span>+{currency}{activeReceiptBill.serviceCharge.toFixed(2)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-baseline text-sm font-bold pt-1">
                <span>PAID VIA {activeReceiptBill.paymentMethod.toUpperCase()}:</span>
                <span className="text-base">{currency}{activeReceiptBill.total.toFixed(2)}</span>
              </div>

              <div className="text-center pt-3 text-[10px] text-stone-500">
                Thank you for visiting {cafeName}! ✨
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveReceiptBill(null)}
                className="px-3 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const receiptSummary = `🧾 *${cafeName} Receipt*\nTable: ${activeReceiptBill.tableLabel}\nDate: ${new Date(activeReceiptBill.createdAt).toLocaleString()}\nTotal Paid: ${currency}${activeReceiptBill.total.toFixed(2)} (${activeReceiptBill.paymentMethod})\nThank you for visiting! ✨`;
                    navigator.clipboard?.writeText(receiptSummary);
                    alert('Receipt text copied to clipboard!');
                  }}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition"
                  title="Copy Receipt Text"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🧾 *${cafeName} Tax Invoice*\nTable: ${activeReceiptBill.tableLabel}\nReceipt: #${activeReceiptBill.id.slice(-6).toUpperCase()}\nAmount Paid: ${currency}${activeReceiptBill.total.toFixed(2)} via ${activeReceiptBill.paymentMethod}\nThank you for dining with us!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Share via WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" /> WhatsApp
                </a>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
