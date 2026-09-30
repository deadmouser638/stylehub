import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, Package, PackageCheck, Truck, CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { formatPrice, parseDbDate } from '../utils/format';

const STEPS = [
  { label: 'Placed', icon: Package, statuses: ['Pending'] },
  { label: 'Confirmed', icon: CircleCheck, statuses: ['Confirmed'] },
  { label: 'Packed', icon: PackageCheck, statuses: ['Packed'] },
  { label: 'Shipped', icon: Truck, statuses: ['Shipped'] },
  { label: 'Delivered', icon: CircleCheck, statuses: ['Delivered'] },
];

const TrackOrder = () => {
  const { user } = useContext(AuthContext);
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const track = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/orders/track', { params: { orderId, email } });
      setOrder(res.data.data);
    } catch (err) {
      setOrder(null);
      setError(err.response?.data?.message || 'Could not find that order');
    } finally {
      setLoading(false);
    }
  };

  const current = order ? STEPS.findIndex(s => s.statuses.includes(order.status)) : -1;

  return (
    <div className="container-x max-w-3xl py-8 md:py-12">
      <p className="eyebrow">Order tracking</p>
      <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Track your order</h1>
      <p className="mt-2 text-muted">Enter your order number and the email you used at checkout.</p>

      <form onSubmit={track} className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <label className="block">
          <span className="label">Order number</span>
          <input required inputMode="numeric" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="e.g. 12" className="input" />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
        </label>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? <LoaderCircle size={18} className="animate-spin" /> : <PackageSearch size={18} />} Track</button>
      </form>
      {error && <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm font-semibold text-accent-text" role="alert">{error}</p>}

      {order && (
        <section className="card mt-6 p-5 animate-slide-up sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Order #{order.id} · {formatPrice(order.total_amount)} · {order.payment_method}</p>
              <p className="font-display text-2xl font-semibold">{order.status === 'Pending' ? 'Order placed' : order.status}</p>
              <p className="text-sm text-muted">Delivering to {order.city} {order.pincode}</p>
            </div>
            {order.tracking_number && (
              <div className="rounded-2xl bg-surface-2 px-4 py-2 text-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{order.courier || 'Courier'}</p>
                <p className="font-mono font-extrabold">{order.tracking_number}</p>
              </div>
            )}
          </div>

          {order.status === 'Cancelled' ? (
            <p className="mt-5 flex items-center gap-2 font-semibold text-accent-text"><CircleX size={18} /> This order was cancelled.</p>
          ) : (
            <ol className="mt-6 flex items-start" aria-label="Order progress">
              {STEPS.map(({ label, icon: Icon }, i) => (
                <li key={label} className="flex flex-1 items-start last:flex-none">
                  <span className="flex w-14 flex-col items-center gap-1.5 text-center">
                    <span className={`grid h-9 w-9 place-items-center rounded-full ${i <= current ? 'bg-success text-on-success' : 'bg-surface-3 text-muted'}`}><Icon size={17} /></span>
                    <span className={`text-[11px] font-bold ${i <= current ? 'text-fg' : 'text-muted'}`}>{label}</span>
                  </span>
                  {i < STEPS.length - 1 && <span className={`mt-4 h-0.5 flex-1 rounded ${i < current ? 'bg-success' : 'bg-surface-3'}`} aria-hidden="true" />}
                </li>
              ))}
            </ol>
          )}

          <h2 className="mt-8 text-sm font-extrabold uppercase tracking-wider">Updates</h2>
          <ol className="mt-3 space-y-4 border-l-2 border-line-strong pl-5">
            {[...order.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ${i === 0 ? 'bg-accent' : 'bg-line-strong'}`} aria-hidden="true" />
                <p className="font-bold">{h.status}</p>
                {h.note && <p className="text-sm text-muted">{h.note}</p>}
                <p className="text-xs text-muted">{parseDbDate(h.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              </li>
            ))}
          </ol>

          <ul className="mt-6 divide-y divide-line border-t border-line">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-3 text-sm">
                {item.image && <img src={item.image.replace('w=800', 'w=120')} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                <span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
                <span className="text-muted">×{item.quantity}</span>
              </li>
            ))}
          </ul>
          {user && <Link to="/orders" className="link mt-4 inline-block text-sm">See all my orders</Link>}
        </section>
      )}
    </div>
  );
};

export default TrackOrder;
