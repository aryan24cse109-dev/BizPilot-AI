import React from 'react';

const statusStyles = {
  // Invoice statuses
  PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  PARTIALLY_PAID: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  SENT: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  VIEWED: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  OVERDUE: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  DRAFT: 'bg-slate-700/30 text-slate-400 border-slate-600/40',
  CANCELLED: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  REFUNDED: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  
  // Payment statuses
  SUCCEEDED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PROCESSING: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  FAILED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',

  // Connection statuses
  ACCEPTED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export const Badge = ({ status, label, className = '' }) => {
  const normStatus = String(status || '').toUpperCase();
  const style = statusStyles[normStatus] || 'bg-slate-800 text-slate-300 border-slate-700';
  const displayLabel = label || normStatus.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      {displayLabel}
    </span>
  );
};
