import React, { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Table, Order } from '../../../types';
import { TableStatusBadge } from '../../../components/common/StatusBadge';
import QRCode from 'qrcode';
import {
  Plus,
  QrCode,
  Download,
  Trash2,
  Edit2,
  ExternalLink,
  Layers,
  Printer,
  Check,
  X,
  Coffee
} from 'lucide-react';

interface Props {
  cafeId: string;
  cafeName: string;
  tables: Table[];
  orders: Order[];
}

export const TablesTab: React.FC<Props> = ({ cafeId, cafeName, tables, orders }) => {
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [printTable, setPrintTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate QR codes for all tables
  useEffect(() => {
    const generateAllQrs = async () => {
      const urls: Record<string, string> = {};
      const origin = window.location.origin;

      for (const table of tables) {
        const orderUrl = `${origin}/order/${cafeId}/${table.id}`;
        try {
          const dataUrl = await QRCode.toDataURL(orderUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#1c1917',
              light: '#ffffff'
            }
          });
          urls[table.id] = dataUrl;
        } catch (err) {
          console.error('Error generating QR for table:', table.id, err);
        }
      }
      setQrCodeUrls(urls);
    };

    if (tables.length > 0) {
      generateAllQrs();
    }
  }, [tables, cafeId]);

  // Determine occupancy based on live non-completed/non-cancelled orders
  const isTableOccupied = (tableId: string) => {
    return orders.some(
      o => o.tableId === tableId && ['New', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.status)
    );
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableLabel.trim()) return;
    setLoading(true);

    try {
      const tableId = `T${tables.length + 1}-${Math.random().toString(36).substring(2, 5)}`;
      const tableData: Table = {
        id: tableId,
        label: newTableLabel.trim(),
        status: 'free'
      };

      await setDoc(doc(db, `cafes/${cafeId}/tables`, tableId), tableData);
      setNewTableLabel('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Error adding table:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setLoading(true);

    try {
      await updateDoc(doc(db, `cafes/${cafeId}/tables`, editingTable.id), {
        label: editingTable.label
      });
      setEditingTable(null);
    } catch (err) {
      console.error('Error updating table:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (table: Table) => {
    if (!window.confirm(`Delete "${table.label}"? Existing table QR codes will stop routing.`)) return;
    try {
      await deleteDoc(doc(db, `cafes/${cafeId}/tables`, table.id));
    } catch (err) {
      console.error('Error deleting table:', err);
    }
  };

  const downloadQrPng = (table: Table) => {
    const dataUrl = qrCodeUrls[table.id];
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${cafeName.toLowerCase().replace(/\s+/g, '-')}-table-${table.label.replace(/\s+/g, '-')}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" /> Dining Tables & QR Codes
          </h2>
          <p className="text-xs text-stone-400">
            Each table has a dedicated QR code linking directly to that table's mobile ordering menu.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" /> Add New Table
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map(table => {
          const occupied = isTableOccupied(table.id) || table.status === 'occupied';
          const tableOrders = orders.filter(
            o => o.tableId === table.id && ['New', 'Accepted', 'Preparing', 'Ready', 'Served'].includes(o.status)
          );
          const activeTotal = tableOrders.reduce((sum, o) => sum + (o.total || o.subtotal || 0), 0);
          const qrUrl = qrCodeUrls[table.id];

          return (
            <div
              key={table.id}
              className={`bg-stone-900 rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                occupied
                  ? 'border-rose-500/60 ring-1 ring-rose-500/30'
                  : 'border-stone-800 hover:border-stone-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-stone-100">{table.label}</h3>
                    <span className="text-[11px] font-mono text-stone-500">ID: {table.id}</span>
                  </div>
                  <TableStatusBadge status={occupied ? 'occupied' : 'free'} />
                </div>

                {/* QR Code display */}
                <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center border border-stone-200 my-3 shadow-inner">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt={`QR code for ${table.label}`}
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-stone-400 animate-pulse">
                      Generating QR...
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-stone-600 font-semibold mt-1">
                    Scan to Order
                  </span>
                </div>

                {/* Active orders indicator */}
                {occupied && (
                  <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-2.5 mb-3 text-xs">
                    <span className="font-semibold text-rose-300 block">
                      Active: {tableOrders.length} {tableOrders.length === 1 ? 'order' : 'orders'}
                    </span>
                    <span className="text-stone-300 font-mono text-[11px]">
                      Bill Total: ₹{activeTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  {/* Download PNG */}
                  <button
                    onClick={() => downloadQrPng(table)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                    title="Download QR Code PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Print Table Card */}
                  <button
                    onClick={() => setPrintTable(table)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                    title="Print Table Standee Tent Card"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  {/* Rename */}
                  <button
                    onClick={() => setEditingTable(table)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                    title="Rename Table"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteTable(table)}
                    className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition"
                    title="Delete Table"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Launch customer ordering URL */}
                <a
                  href={`/order/${cafeId}/${table.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-stone-950 font-medium text-xs flex items-center gap-1 transition"
                  title="Test Customer Mobile Menu for this table"
                >
                  <ExternalLink className="w-3 h-3" /> Test Order
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl">
            <h3 className="text-lg font-bold font-serif mb-3">Add Dining Table</h3>
            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Table Label / Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 7 (Patio) or Bar Stand 3"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition"
                >
                  {loading ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Table Modal */}
      {editingTable && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl">
            <h3 className="text-lg font-bold font-serif mb-3">Rename Table</h3>
            <form onSubmit={handleUpdateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Table Label
                </label>
                <input
                  type="text"
                  required
                  value={editingTable.label}
                  onChange={(e) => setEditingTable({ ...editingTable, label: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Standee Tent Card Modal */}
      {printTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-6 text-stone-100 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold font-serif">Table Standee Card Preview</h3>
              <button onClick={() => setPrintTable(null)} className="p-1 rounded text-stone-400 hover:text-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable card preview */}
            <div className="bg-amber-50 text-stone-900 rounded-2xl p-8 border-2 border-stone-800 shadow-xl text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Coffee className="w-6 h-6 text-amber-800" />
                <h4 className="text-xl font-bold font-serif tracking-tight text-stone-900">{cafeName}</h4>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-stone-300">
                <img
                  src={qrCodeUrls[printTable.id]}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div>
                <span className="text-2xl font-black font-mono tracking-wide text-stone-900 block">
                  {printTable.label}
                </span>
                <p className="text-xs text-stone-600 font-medium mt-1">
                  Point phone camera to browse fresh menu, customize dishes & order directly!
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => downloadQrPng(printTable)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Save QR PNG
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Print Table Standee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
