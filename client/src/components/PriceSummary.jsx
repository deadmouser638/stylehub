import React from 'react';
import { formatPrice } from '../utils/format';

const Row = ({ label, value, tone }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted">{label}</span>
    <span className={`font-semibold ${tone === 'good' ? 'text-success' : ''}`}>{value}</span>
  </div>
);

const PriceSummary = ({ summary, itemCount, couponCode }) => (
  <>
    <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider">Price details ({itemCount} {itemCount === 1 ? 'item' : 'items'})</h3>
    <div className="space-y-3 text-sm">
      <Row label="Total MRP" value={formatPrice(summary.totalMrp)} />
      <Row label="Discount on MRP" value={`−${formatPrice(summary.mrpDiscount)}`} tone="good" />
      {summary.couponDiscount > 0 && (
        <Row label={`Coupon${couponCode ? ` (${couponCode})` : ''}`} value={`−${formatPrice(summary.couponDiscount)}`} tone="good" />
      )}
      <Row label="Delivery fee" value={summary.deliveryFee === 0 ? 'FREE' : formatPrice(summary.deliveryFee)} tone={summary.deliveryFee === 0 ? 'good' : undefined} />
    </div>
    <div className="mt-4 flex justify-between border-t border-line pt-4 text-base font-extrabold">
      <span>Total amount</span>
      <span>{formatPrice(summary.total)}</span>
    </div>
  </>
);

export default PriceSummary;
