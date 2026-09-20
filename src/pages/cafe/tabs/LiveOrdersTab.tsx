import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Order, OrderStatus, CafeAlert, CafeSettings, OrderItem, SelectedAddOn } from '../../../types';
import { OrderStatusBadge } from '../../../components/common/StatusBadge';
import {
  Bell,
  Clock,
  Check,
  ChefHat,
  Flame,
  CheckCheck,
  XCircle,
  Volume2,
  VolumeX,
  UserCheck,
  Minus,
  Plus,
  Trash2
} from 'lucide-react';
import { playOrderNotificationSound } from '../../../lib/sound';

interface Props {
  cafeId: string;
  orders: Order[];
  alerts: CafeAlert[];
  settings: CafeSettings;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const LiveOrdersTab: React.FC<Props> = ({
  cafeId,
  orders,
  alerts,
  settings,
  soundEnabled,
  onToggleSound,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('active');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const currency = settings.currency || '$';

  // Advance order status
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, `cafes/${cafeId}/orders`, orderId), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Adjust item quantity on New orders before accepting
  const handleAdjustItemQty = async (order: Order, itemIndex: number, delta: number) => {
    const updatedItems = [...order.items];
    const targetItem = updatedItems[itemIndex];
    if (!targetItem) return;

    const newQty = targetItem.qty + delta;
    if (newQty <= 0) {
      updatedItems.splice(itemIndex, 1);
    } else {
      updatedItems[itemIndex] = { ...targetItem, qty: newQty };
    }

    if (updatedItems.length === 0) {
      // Cancel order if all items removed
      await handleUpdateStatus(order.id, 'Cancelled');
      return;
    }

    // Recalculate total
    const newTotal = updatedItems.reduce((sum, it) => {
      const addOnsTotal = (it.addOns || []).reduce((aSum, a) => aSum + (a.price || 0), 0);
      return sum + (it.price + addOnsTotal) * it.qty;
    }, 0);

    try {
      await updateDoc(doc(db, `cafes/${cafeId}/orders`, order.id), {
        items: updatedItems,
        subtotal: Number(newTotal.toFixed(2)),
        total: Number(newTotal.toFixed(2)),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error adjusting item quantity:', err);
    }
  };

  // Reject / Remove item from order
  const handleRejectItem = async (order: Order, itemIndex: number) => {
    await handleAdjustItemQty(order, itemIndex, -order.items[itemIndex].qty);
  };

  // Resolve waiter alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, `cafes/${cafeId}/alerts`, alertId), {
        resolved: true
      });
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (selectedStatusFilter === 'active') {
      return ['New', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.status);
    }
    if (selectedStatusFilter === 'kitchen') {
      return ['New', 'Accepted', 'Preparing'].includes(o.status);
    }
    if (selectedStatusFilter === 'all') return true;
    return o.status === selectedStatusFilter;
  });

  // Group by table
  const ordersByTable: Record<string, Order[]> = {};
  filteredOrders.forEach(order => {
    const key = order.tableLabel || order.tableId || 'Walk-in';
    if (!ordersByTable[key]) ordersByTable[key] = [];
    ordersByTable[key].push(order);
  });

  const activeCount = orders.filter(o => ['New', 'Accepted', 'Preparing', 'Ready'].includes(o.status)).length;
  const newCount = orders.filter(o => o.status === 'New').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Audio Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
              Kitchen & Live Orders
              {newCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-stone-950 animate-bounce">
                  {newCount} NEW
                </span>
              )}
            </h2>
            <p className="text-xs text-stone-400">
              Real-time Firestore sync • {activeCount} in-progress orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={playOrderNotificationSound}
            className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition"
            title="Test audio chime"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" /> Test Bell
          </button>

          <button
            onClick={onToggleSound}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Chime ON' : 'Muted'}
          </button>
        </div>
      </div>

      {/* Waiter Assistance Alert Banner */}
      {unresolvedAlerts.length > 0 && (
        <div className="space-y-2">
          {unresolvedAlerts.map(alert => (
            <div
              key={alert.id}
              className="bg-amber-950/80 border-2 border-amber-500/80 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse shadow-lg shadow-amber-500/10 text-stone-100"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-stone-950 rounded-xl font-bold">
                  <Bell className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300 text-sm">
                      Customer Assistance Requested!
                    </span>
                    <span className="text-xs bg-amber-900/90 text-amber-200 px-2 py-0.5 rounded border border-amber-700 font-mono">
                      {alert.tableLabel || `Table ${alert.tableId}`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Customer at {alert.tableLabel || `Table ${alert.tableId}`} called for a waiter •{' '}
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleResolveAlert(alert.id)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow transition shrink-0"
              >
                <UserCheck className="w-4 h-4" /> Acknowledge & Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'active', label: 'All Active' },
            { id: 'kitchen', label: 'Kitchen (New / Prep)' },
            { id: 'New', label: 'New Only' },
            { id: 'Preparing', label: 'In Prep' },
            { id: 'Ready', label: 'Ready for Table' },
            { id: 'Served', label: 'Served' },
            { id: 'all', label: 'All History' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedStatusFilter === tab.id
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-stone-400 font-medium">
          Showing {filteredOrders.length} orders
        </span>
      </div>

      {/* Orders Stream Grouped By Table or Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-12 text-center text-stone-400 space-y-3">
          <ChefHat className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-stone-200">No Orders in this View</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            When guests place orders from their table QR codes or customer app, they will appear here in real time with audio chime alerts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(ordersByTable).map(([tableTitle, tableOrders]: [string, Order[]]) => (
            <div key={tableTitle} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold text-stone-200 font-mono uppercase tracking-wide">
                  {tableTitle}
                </h3>
                <span className="text-xs text-stone-500">
                  ({tableOrders.length} {tableOrders.length === 1 ? 'order ticket' : 'order tickets'})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tableOrders.map((order: Order) => {
                  const isNew = order.status === 'New';
                  const isAccepted = order.status === 'Accepted';
                  const isPrep = order.status === 'Preparing';
                  const isReady = order.status === 'Ready';
                  const isServed = order.status === 'Served';

                  const elapsedMin = Math.max(
                    0,
                    Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                  );

                  return (
                    <div
                      key={order.id}
                      className={`bg-stone-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg ${
                        isNew
                          ? 'border-amber-500/80 ring-1 ring-amber-500/50 bg-stone-900'
                          : isReady
                          ? 'border-emerald-500/80 ring-1 ring-emerald-500/40'
                          : 'border-stone-800'
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="p-4 border-b border-stone-800 bg-stone-950/40 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-100 font-mono">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <span className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-500" /> {elapsedMin}m ago (
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            )
                          </span>
                        </div>
                        <span className="text-sm font-bold text-amber-400 font-serif">
                          {currency}{(order.total || order.subtotal || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="p-4 space-y-2.5 flex-1">
                        {order.items.map((item: OrderItem, idx: number) => (
                          <div key={idx} className="text-xs border-b border-stone-800/50 pb-2 last:border-0 last:pb-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-stone-200 flex-1">
                                <span className="text-amber-400 font-mono font-bold mr-1.5">
                                  {item.qty}x
                                </span>
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isNew && (
                                  <div className="flex items-center gap-1 bg-stone-950 px-1 py-0.5 rounded border border-stone-800">
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustItemQty(order, idx, -1)}
                                      className="p-0.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded"
                                      title="Reduce Quantity"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-[10px] font-mono font-bold text-stone-200 px-1">
                                      {item.qty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustItemQty(order, idx, 1)}
                                      className="p-0.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded"
                                      title="Increase Quantity"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectItem(order, idx)}
                                      className="p-0.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded ml-0.5"
                                      title="Reject Item from Ticket"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                <span className="text-stone-400 text-[11px] font-mono">
                                  {currency}{(item.price * item.qty).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* AddOns */}
                            {item.addOns && item.addOns.length > 0 && (
                              <div className="pl-5 mt-1 space-y-0.5">
                                {item.addOns.map((add: SelectedAddOn, aIdx: number) => (
                                  <div key={aIdx} className="text-[11px] text-stone-400 flex justify-between">
                                    <span>+ {add.name}</span>
                                    {add.price > 0 && (
                                      <span className="text-stone-500 font-mono">
                                        +{currency}{add.price.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Special notes */}
                            {item.notes && (
                              <div className="mt-1 pl-5 text-[11px] text-amber-300 italic bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/40">
                                💬 "{item.notes}"
                              </div>
                            )}
                          </div>
                        ))}

                        {order.notes && (
                          <div className="p-2 bg-stone-950 rounded-lg text-xs text-stone-300 border border-stone-800">
                            <strong>Table Notes:</strong> {order.notes}
                          </div>
                        )}
                      </div>

                      {/* Workflow Stage Action Buttons */}
                      <div className="p-3 bg-stone-950/70 border-t border-stone-800 flex items-center gap-2">
                        {isNew && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Accepted')}
                            disabled={updatingId === order.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept Order
                          </button>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                            disabled={updatingId === order.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                          >
                            <Flame className="w-3.5 h-3.5" /> Send to Kitchen / Prep
                          </button>
                        )}

                        {isPrep && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Ready')}
                            disabled={updatingId === order.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark Ready for Server
                          </button>
                        )}

                        {isReady && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Served')}
                            disabled={updatingId === order.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-100 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Mark Served to Table
                          </button>
                        )}

                        {isServed && (
                          <div className="w-full text-center py-1.5 px-2 bg-stone-900 rounded-lg text-xs text-stone-400 border border-stone-800">
                            ✓ Served to Table • Awaiting Settlement in Billing Tab
                          </div>
                        )}

                        {/* Optional status back / cancel */}
                        {!['Completed', 'Cancelled', 'Served'].includes(order.status) && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'Cancelled')}
                            disabled={updatingId === order.id}
                            className="p-2 rounded-xl text-stone-500 hover:text-rose-400 hover:bg-stone-800 transition"
                            title="Cancel Order Ticket"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
