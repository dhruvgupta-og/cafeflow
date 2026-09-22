import React from 'react';
import { OrderStatus, TableStatus, CafeStatus, CafePlan } from '../../types';

export const OrderStatusBadge: React.FC<{ status: OrderStatus; className?: string }> = ({ status, className = '' }) => {
  const configs: Record<OrderStatus, { bg: string; text: string; border: string; label: string; dot?: string }> = {
    New: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      border: 'border-amber-300',
      label: 'New Order',
      dot: 'bg-amber-500 animate-ping'
    },
    Accepted: {
      bg: 'bg-sky-100',
      text: 'text-sky-800',
      border: 'border-sky-300',
      label: 'Accepted',
      dot: 'bg-sky-500'
    },
    Preparing: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      border: 'border-indigo-300',
      label: 'In Kitchen / Brewing',
      dot: 'bg-indigo-500 animate-pulse'
    },
    Ready: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      label: 'Ready for Pickup',
      dot: 'bg-emerald-500'
    },
    Served: {
      bg: 'bg-stone-100',
      text: 'text-stone-700',
      border: 'border-stone-300',
      label: 'Served to Table',
      dot: 'bg-stone-400'
    },
    Completed: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-300',
      label: 'Completed & Billed',
      dot: 'bg-purple-500'
    },
    Cancelled: {
      bg: 'bg-rose-100',
      text: 'text-rose-800',
      border: 'border-rose-300',
      label: 'Cancelled',
      dot: 'bg-rose-500'
    }
  };

  const c = configs[status] || configs.New;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border} ${className}`}>
      {c.dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
      {c.label}
    </span>
  );
};

export const TableStatusBadge: React.FC<{ status: TableStatus }> = ({ status }) => {
  if (status === 'occupied') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Occupied
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Free
    </span>
  );
};

export const CafeStatusBadge: React.FC<{ status: CafeStatus }> = ({ status }) => {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Suspended
    </span>
  );
};

export const PlanBadge: React.FC<{ plan: CafePlan }> = ({ plan }) => {
  const colors: Record<CafePlan, string> = {
    Starter: 'bg-stone-100 text-stone-700 border-stone-300',
    Pro: 'bg-amber-100 text-amber-800 border-amber-300',
    Enterprise: 'bg-purple-100 text-purple-800 border-purple-300'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors[plan] || colors.Starter}`}>
      {plan}
    </span>
  );
};
