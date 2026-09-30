import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ORDER_STATUS_STYLES = {
  Pending: 'bg-surface-3 text-fg',
  Confirmed: 'bg-accent-soft text-accent-text',
  Packed: 'bg-accent-soft text-accent-text',
  Shipped: 'bg-accent-soft text-accent-text',
  Delivered: 'bg-success-soft text-success',
  Cancelled: 'bg-surface-3 text-muted line-through',
};

export const PAYMENT_STATUS_STYLES = {
  Paid: 'bg-success-soft text-success',
  Verifying: 'bg-accent-soft text-accent-text',
  Pending: 'bg-surface-3 text-fg',
  'Pay on Delivery': 'bg-surface-3 text-fg',
};

export const Badge = ({ children, className = 'bg-surface-3 text-fg' }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ${className}`}>{children}</span>
);

export const Pager = ({ pagination, onChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">Page {pagination.page} of {pagination.pages} · {pagination.total} total</span>
      <div className="flex gap-2">
        <button onClick={() => onChange(pagination.page - 1)} disabled={pagination.page <= 1} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong disabled:opacity-40" aria-label="Previous page"><ChevronLeft size={16} /></button>
        <button onClick={() => onChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong disabled:opacity-40" aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
};

export const Field = ({ label, children, hint, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
);

export const Toggle = ({ checked, onChange, label }) => (
  <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
    <span className={`relative h-6 w-11 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${checked ? 'bg-success' : 'bg-surface-3'}`} aria-hidden="true">
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
    {label}
  </label>
);

// datetime-local inputs want "YYYY-MM-DDTHH:MM"; SQLite stores "YYYY-MM-DD HH:MM:SS" (UTC)
export const toInputDate = (value) => (value ? String(value).replace(' ', 'T').slice(0, 16) : '');
