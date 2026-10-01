import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, PackageCheck, Truck, CircleCheck, CircleX, ArrowRight, MapPin, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Spinner } from '../components/ui/Skeletons';
import Modal from '../components/ui/Modal';
import UpiPayment from '../components/UpiPayment';
import { addDays, formatDate, formatPrice, parseDbDate } from '../utils/format';

const TIMELINE = [
  { label: 'Ordered', icon: Package },
  { label: 'Packed', icon: PackageCheck },
  { label: 'Shipped', icon: Truck },
  { label: 'Delivered', icon: CircleCheck },
];

// Progress follows the status the store sets in the admin panel
const STEP_FOR_STATUS = { Pending: 0, Confirmed: 0, Packed: 1, Shipped: 2, Delivered: 3 };
const progressStep = (order) => STEP_FOR_STATUS[order.status] ?? 0;

const PAYMENT_TEXT = {
  Pending: 'Payment pending',
  Verifying: 'Verifying payment',
  Paid: 'Paid',
  'Pay on Delivery': 'Pay on delivery',
  Failed: 'Payment failed',
  'Refund Initiated': 'Refund initiated',
  Refunded: 'Refunded',
};

const ORDERS_KEY = 'electrohub_orders_cache';

const getCachedOrders = () => {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const Orders = () => {
  const [orders, setOrders] = useState(getCachedOrders);
  const [loading, setLoading] = useState(() => getCachedOrders().length === 0);
  const [cancellingId, setCancellingId] = useState(null);
  const [upiPayment, setUpiPayment] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      const serverOrders = res.data.data || [];
      const localOrders = getCachedOrders();
      // Merge unique orders, preserving locally updated status if newer
      const orderMap = new Map();
      serverOrders.forEach(o => orderMap.set(o.id, o));
      localOrders.forEach(o => {
        const existing = orderMap.get(o.id);
        if (!existing) {
          orderMap.set(o.id, o);
        } else {
          // If local has newer updated_at or is cancelled/advanced, retain the newer status
          const localUpdated = local.updated_at ? new Date(local.updated_at).getTime() : 0;
          const serverUpdated = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
          if (localUpdated >= serverUpdated) {
            orderMap.set(o.id, { ...existing, ...local });
          } else {
            orderMap.set(o.id, { ...local, ...existing });
          }
        }
      });
      const merged = Array.from(orderMap.values()).sort((a, b) => (new Date(b.created_at) - new Date(a.created_at)) || (b.id - a.id));
      setOrders(merged);
      try { localStorage.setItem(ORDERS_KEY, JSON.stringify(merged)); } catch {}
    } catch (err) {
      console.error('Error fetching orders:', err);
      const fallback = getCachedOrders();
      if (fallback.length > 0) setOrders(fallback);
      else toast.error(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const handleUpdate = () => {
      const updated = getCachedOrders();
      if (updated.length > 0) setOrders(updated);
      fetchOrders();
    };
    window.addEventListener('electrohub_order_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('electrohub_order_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const openUpi = async (orderId) => {
    try {
      const res = await api.get(`/payments/upi/${orderId}`);
      setUpiPayment(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load payment details');
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm(`Cancel order #${orderId}?`)) return;
    setCancellingId(orderId);
    
    // Immediate optimistic update
    const nowIso = new Date().toISOString();
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Cancelled', payment_status: 'Refund Initiated', updated_at: nowIso } : o));
    try {
      const list = getCachedOrders();
      const updated = list.map(o => o.id === orderId ? { ...o, status: 'Cancelled', payment_status: 'Refund Initiated', updated_at: nowIso } : o);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));

      const adminList = JSON.parse(localStorage.getItem('electrohub_admin_orders') || '[]');
      const adminUpdated = adminList.map(o => o.id === orderId ? { ...o, status: 'Cancelled', payment_status: 'Refund Initiated', updated_at: nowIso } : o);
      localStorage.setItem('electrohub_admin_orders', JSON.stringify(adminUpdated));

      window.dispatchEvent(new CustomEvent('electrohub_order_updated', { detail: { orderId, status: 'Cancelled' } }));
    } catch {}

    toast.success('Order cancelled');
    try {
      await api.put(`/orders/${orderId}/cancel`);
    } catch (err) {
      console.warn('Server cancel warning:', err);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <Spinner />;

  if (orders.length === 0) {
    return (
      <div className="container-x py-12">
        <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-surface-2"><Package size={36} /></span>
          <h1 className="mt-6 font-display text-3xl font-semibold">No orders yet</h1>
          <p className="mt-2 text-muted">When you place an order, you can track it here.</p>
          <Link to="/products" className="btn-primary mt-7">Start shopping <ArrowRight size={16} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x max-w-5xl py-8 md:py-12">
      <h1 className="mb-8 font-display text-3xl font-semibold md:text-4xl">My orders</h1>
      <div className="space-y-6">
        {orders.map(order => {
          const cancelled = order.status === 'Cancelled';
          const step = progressStep(order);
          const eta = addDays(parseDbDate(order.created_at), 5);
          return (
            <article key={order.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface-2 px-5 py-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted">Order</p><p className="font-extrabold">#{order.id}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted">Placed on</p><p className="font-extrabold">{formatDate(order.created_at)}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted">Total</p><p className="font-extrabold">{formatPrice(order.total_amount)}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wider text-muted">Payment</p><p className="font-extrabold">{order.payment_method}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!cancelled && <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${order.payment_status === 'Paid' ? 'bg-success-soft text-success' : 'bg-surface-3 text-fg'}`}>{PAYMENT_TEXT[order.payment_status] || order.payment_status}</span>}
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${cancelled ? 'bg-accent-soft text-accent-text' : 'bg-success-soft text-success'}`}>
                    {cancelled ? 'Cancelled' : order.status === 'Pending' ? 'Placed' : order.status}
                  </span>
                </div>
              </header>

              <div className="p-5">
                {cancelled ? (
                  <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-accent-text"><CircleX size={18} /> This order was cancelled. Any payment will be refunded within 5–7 days.</p>
                ) : (
                  <div className="mb-6">
                    {order.payment_method === 'UPI' && order.payment_status === 'Pending' && (
                      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-accent-soft p-4 sm:flex-row sm:items-center">
                        <p className="flex-1 text-sm font-semibold text-accent-text">Your UPI payment of {formatPrice(order.total_amount)} is pending. Pay now to confirm this order.</p>
                        <button onClick={() => openUpi(order.id)} className="btn-primary py-2.5"><QrCode size={16} /> Complete payment</button>
                      </div>
                    )}
                    {order.payment_status === 'Verifying' && (
                      <p className="mb-5 rounded-2xl bg-surface-2 p-4 text-sm">We received your payment reference <strong className="font-mono">{order.payment_ref}</strong> and are verifying it.</p>
                    )}
                    <ol className="flex items-center" aria-label="Order progress">
                      {TIMELINE.map(({ label, icon: Icon }, i) => (
                        <li key={label} className="flex flex-1 items-center last:flex-none">
                          <span className="flex flex-col items-center gap-1.5">
                            <span className={`grid h-9 w-9 place-items-center rounded-full ${i <= step ? 'bg-success text-on-success' : 'bg-surface-3 text-muted'}`}><Icon size={17} /></span>
                            <span className={`text-[11px] font-bold ${i <= step ? 'text-fg' : 'text-muted'}`}>{label}</span>
                          </span>
                          {i < TIMELINE.length - 1 && <span className={`mx-1 mb-5 h-0.5 flex-1 rounded ${i < step ? 'bg-success' : 'bg-surface-3'}`} aria-hidden="true" />}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-sm"><span className="text-muted">{order.status === 'Delivered' ? 'Delivered' : 'Expected by'}</span> <strong>{eta.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                      {order.tracking_number && <> · <span className="text-muted">{order.courier || 'Courier'}</span> <strong className="font-mono">{order.tracking_number}</strong></>}</p>
                  </div>
                )}

                {order.history?.length > 0 && (
                  <details className="mb-4 rounded-2xl bg-surface-2 p-4">
                    <summary className="cursor-pointer text-sm font-extrabold">Tracking history ({order.history.length} updates)</summary>
                    <ol className="mt-3 space-y-3 border-l-2 border-line-strong pl-4">
                      {[...order.history].reverse().map((h, i) => (
                        <li key={i} className="relative text-sm">
                          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
                          <p className="font-bold">{h.status}</p>
                          {h.note && <p className="text-muted">{h.note}</p>}
                          <p className="text-xs text-muted">{parseDbDate(h.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                <ul className="divide-y divide-line">
                  {order.items.map(item => (
                    <li key={item.id} className="flex items-center gap-4 py-3">
                      {item.image
                        ? <img src={item.image.replace('w=800', 'w=160')} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" />
                        : <span className="grid h-20 w-16 shrink-0 place-items-center rounded-xl bg-surface-2"><Package size={20} className="text-muted" /></span>}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold">{item.name}</p>
                        <p className="mt-1 text-xs text-muted">{item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity} · {formatPrice(item.price * item.quantity)}</p>
                      </div>
                      <Link to={`/product/${item.product_id}`} className="link shrink-0 text-xs">{cancelled ? 'Buy again' : 'View'}</Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <MapPin size={14} /> {order.address_snapshot?.name}, {order.address_snapshot?.city} {order.address_snapshot?.pincode}
                  </p>
                  {['Pending', 'Confirmed'].includes(order.status) && (
                    <button onClick={() => handleCancel(order.id)} disabled={cancellingId === order.id} className="btn-outline px-5 py-2 text-xs hover:border-danger hover:text-danger">
                      {cancellingId === order.id ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal open={!!upiPayment} onClose={() => setUpiPayment(null)} title="Complete your UPI payment" variant="wide" className="max-w-3xl">
        {upiPayment && (
          <div className="p-5 sm:p-6">
            <UpiPayment payment={upiPayment} onSubmitted={() => { setUpiPayment(null); fetchOrders(); }} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
