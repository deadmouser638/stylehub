import React, { useState } from 'react';
import { Smartphone, Copy, Check, ShieldCheck, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatPrice } from '../utils/format';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Shows the UPI QR code / deep link for an order and collects the UTR after payment.
 * `payment` comes from the server: { qr, uri, amount, upiId, payeeName, orderId }.
 */
const UpiPayment = ({ payment, onSubmitted }) => {
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyUpiId = async () => {
    try { await navigator.clipboard.writeText(payment.upiId); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async (e) => {
    e.preventDefault();
    const clean = utr.replace(/\s/g, '');
    if (!/^\d{12}$/.test(clean)) return toast.error('The UTR is the 12-digit reference number shown in your UPI app after paying');
    setSubmitting(true);
    try {
      const res = await api.post(`/payments/upi/${payment.orderId}/confirm`, { utr: clean });
      toast.success(res.data.message);
      onSubmitted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit payment reference');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
      <div className="mx-auto text-center">
        <div className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-line">
          <img src={payment.qr} alt={`UPI QR code to pay ${formatPrice(payment.amount)}`} className="h-56 w-56 sm:h-64 sm:w-64" />
        </div>
        <p className="mt-3 text-sm text-muted">Scan with any UPI app</p>
        <p className="text-xs font-semibold text-muted">Google Pay · PhonePe · Paytm · BHIM</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Amount to pay</p>
          <p className="font-display text-4xl font-semibold">{formatPrice(payment.amount)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">To</span>
            <strong>{payment.payeeName}</strong>
            <button onClick={copyUpiId} className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 font-mono text-xs font-bold hover:border-fg" aria-label="Copy UPI ID">
              {payment.upiId} {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">Order #{payment.orderId}. The amount and order number are already filled in.</p>
        </div>

        {isMobile() && (
          <a href={payment.uri} className="btn-primary w-full py-3.5"><Smartphone size={18} /> Pay with a UPI app</a>
        )}

        <form onSubmit={submit} className="card space-y-3 p-4">
          <label htmlFor="utr" className="block text-sm font-extrabold">After paying, enter the UTR / transaction ID</label>
          <p className="text-xs text-muted">You'll find the 12-digit UTR (or UPI reference number) in your UPI app's payment details.</p>
          <div className="flex gap-2">
            <input id="utr" inputMode="numeric" maxLength={14} value={utr} onChange={e => setUtr(e.target.value.replace(/[^\d\s]/g, ''))} placeholder="e.g. 412345678901" className="input font-mono" />
            <button type="submit" disabled={submitting} className="btn-dark shrink-0 px-5">{submitting ? <LoaderCircle size={18} className="animate-spin" /> : 'Submit'}</button>
          </div>
        </form>
        <p className="flex items-start gap-2 text-xs text-muted"><ShieldCheck size={15} className="shrink-0 text-success" /> Your order is reserved. We confirm it as soon as your payment is verified.</p>
      </div>
    </div>
  );
};

export default UpiPayment;
