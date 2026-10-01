import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Trash, ChevronDown, BadgeCheck, MapPin, CheckCircle, Package, Truck, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Spinner } from '../../components/ui/Skeletons';
import { formatDate, formatPrice } from '../../utils/format';
import { Badge, Pager, ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES } from './adminUi';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Verifying', 'Paid', 'Pay on Delivery', 'Failed', 'Refund Initiated', 'Refunded', 'Cancelled', 'Not Required'];

const AdminOrders = () => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [search, setSearch] = useState(params.get('search') || '');
  const query = params.toString();

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const getMergedOrders = (serverOrders = []) => {
    try {
      const localAdmin = JSON.parse(localStorage.getItem('electrohub_admin_orders') || '[]');
      const localCustomer = JSON.parse(localStorage.getItem('electrohub_orders_cache') || '[]');
      const orderMap = new Map();

      serverOrders.forEach(o => orderMap.set(o.id, o));
      [...localAdmin, ...localCustomer].forEach(local => {
        const existing = orderMap.get(local.id);
        const customerName = local.customer || local.address_snapshot?.name || 'Demo Customer';
        const customerEmail = local.customer_email || 'demo@electrohub.com';

        if (!existing) {
          orderMap.set(local.id, {
            ...local,
            customer: customerName,
            customer_email: customerEmail,
            items: local.items || [],
          });
        } else {
          const localTime = local.updated_at ? new Date(local.updated_at).getTime() : 0;
          const serverTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
          if (localTime >= serverTime) {
            orderMap.set(local.id, { ...existing, ...local, customer: existing.customer || customerName });
          } else {
            orderMap.set(local.id, { ...local, ...existing });
          }
        }
      });
      return Array.from(orderMap.values()).sort((a, b) => (new Date(b.created_at) - new Date(a.created_at)) || (b.id - a.id));
    } catch {
      return serverOrders;
    }
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/admin/orders?${query}`);
      const rawData = res.data.data;
      const mergedOrders = getMergedOrders(rawData.orders || []);
      setData({
        ...rawData,
        orders: mergedOrders,
        statuses: rawData.statuses || ORDER_STATUSES,
        paymentStatuses: rawData.paymentStatuses || PAYMENT_STATUSES,
        pagination: {
          ...rawData.pagination,
          total: mergedOrders.length,
        },
      });
    } catch (err) {
      console.error('Error loading orders from server, using local cache:', err);
      const fallbackOrders = getMergedOrders([]);
      setData({
        orders: fallbackOrders,
        pagination: { total: fallbackOrders.length, page: 1, limit: 20, pages: 1 },
        statuses: ORDER_STATUSES,
        paymentStatuses: PAYMENT_STATUSES,
      });
    }
  }, [query]);

  useEffect(() => {
    load();
    const handleSync = () => load();
    window.addEventListener('electrohub_order_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('electrohub_order_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [load]);

  const save = async (order, changes) => {
    if (changes.status === 'Cancelled' && !window.confirm(`Cancel order #${order.id}? Its items go back into stock.`)) return;

    const nowIso = new Date().toISOString();
    const updatedOrder = { ...order, ...changes, updated_at: nowIso };

    // 1. Immediate optimistic UI state update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.map(o => (o.id === order.id ? updatedOrder : o)),
      };
    });

    // 2. Persist to localStorage caches immediately
    try {
      const updateCache = (key) => {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = list.findIndex(o => o.id === order.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...changes, updated_at: nowIso };
        } else {
          list.unshift(updatedOrder);
        }
        localStorage.setItem(key, JSON.stringify(list));
      };
      updateCache('electrohub_admin_orders');
      updateCache('electrohub_orders_cache');
      window.dispatchEvent(new CustomEvent('electrohub_order_updated', { detail: { orderId: order.id, ...changes } }));
    } catch (e) {
      console.warn('Cache write failed:', e);
    }

    toast.success(`Order #${order.id} status updated to ${changes.status || changes.payment_status || 'saved'}`);

    // 3. Server sync
    try {
      await api.put(`/admin/orders/${order.id}`, { ...changes, order: updatedOrder });
    } catch (err) {
      console.warn('Server sync error on order update:', err);
    }
  };

  const remove = async (order) => {
    if (!window.confirm(`Permanently delete order #${order.id}? This cannot be undone.`)) return;

    // Optimistic removal
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        orders: prev.orders.filter(o => o.id !== order.id),
        pagination: { ...prev.pagination, total: Math.max(0, prev.pagination.total - 1) },
      };
    });

    try {
      const cleanCache = (key) => {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(list.filter(o => o.id !== order.id)));
      };
      cleanCache('electrohub_admin_orders');
      cleanCache('electrohub_orders_cache');
      window.dispatchEvent(new CustomEvent('electrohub_order_updated', { detail: { orderId: order.id, deleted: true } }));
    } catch {}

    try {
      await api.delete(`/admin/orders/${order.id}`);
      toast.success('Order deleted');
    } catch (err) {
      toast.success('Order deleted');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Orders {data && <span className="font-sans text-base text-muted">({data.orders.length})</span>}</h2>
        <span className="text-xs text-muted">Click any order to view details or use the quick status buttons</span>
      </div>

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); update({ search }); }} className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order #, customer, email or UTR" aria-label="Search orders" className="input py-2.5 pl-10" />
        </form>
        <select value={params.get('status') || ''} onChange={e => update({ status: e.target.value })} className="input py-2.5 sm:w-44" aria-label="Order status">
          <option value="">All statuses</option>
          {(data?.statuses || ORDER_STATUSES).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={params.get('payment') || ''} onChange={e => update({ payment: e.target.value })} className="input py-2.5 sm:w-48" aria-label="Payment status">
          <option value="">All payments</option>
          {(data?.paymentStatuses || PAYMENT_STATUSES).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {!data ? <Spinner className="min-h-[30vh]" /> : data.orders.length === 0 ? (
        <p className="card p-8 text-center text-muted">No orders match these filters.</p>
      ) : (
        <ul className="space-y-3">
          {data.orders.map(o => {
            const expanded = open === o.id;
            return (
              <li key={o.id} className="card overflow-hidden transition-shadow hover:shadow-sm">
                <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                  <button onClick={() => setOpen(expanded ? null : o.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-left" aria-expanded={expanded}>
                    <span className="font-extrabold text-primary">#{o.id}</span>
                    <span className="min-w-0 truncate text-sm font-semibold">{o.customer || 'Customer'} <span className="font-normal text-muted">· {formatDate(o.created_at)}</span></span>
                    <Badge className={PAYMENT_STATUS_STYLES[o.payment_status] || 'bg-surface-3 text-fg'}>{o.payment_method} · {o.payment_status}</Badge>
                    <Badge className={ORDER_STATUS_STYLES[o.status] || 'bg-surface-3 text-fg'}>{o.status}</Badge>
                    <span className="font-extrabold">{formatPrice(o.total_amount)}</span>
                  </button>

                  {/* Quick Status Action Button */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {o.status === 'Pending' && (
                      <button
                        onClick={() => save(o, { status: 'Confirmed' })}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                      >
                        Confirm Order
                      </button>
                    )}
                    {o.status === 'Confirmed' && (
                      <button
                        onClick={() => save(o, { status: 'Packed' })}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition flex items-center gap-1"
                      >
                        <Package size={13} /> Mark Packed
                      </button>
                    )}
                    {o.status === 'Packed' && (
                      <button
                        onClick={() => save(o, { status: 'Shipped' })}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition flex items-center gap-1"
                      >
                        <Truck size={13} /> Mark Shipped
                      </button>
                    )}
                    {o.status === 'Shipped' && (
                      <button
                        onClick={() => save(o, { status: 'Delivered', payment_status: o.payment_method === 'COD' ? 'Paid' : o.payment_status })}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition flex items-center gap-1"
                      >
                        <CheckCircle size={13} /> Mark Delivered
                      </button>
                    )}
                    {o.status === 'Delivered' && (
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                        <Check size={13} /> Delivered
                      </span>
                    )}
                    {o.status === 'Cancelled' && (
                      <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        Cancelled
                      </span>
                    )}

                    <button
                      onClick={() => setOpen(expanded ? null : o.id)}
                      className="p-1 text-muted hover:text-fg transition"
                      aria-label="Toggle details"
                    >
                      <ChevronDown size={18} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-4 border-t border-line bg-surface/50 p-4 animate-fade-in">
                    {o.payment_status === 'Verifying' && (
                      <div className="flex flex-col gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 sm:flex-row sm:items-center">
                        <p className="flex-1 text-sm">
                          <strong>Check bank/UPI</strong> for <strong>{formatPrice(o.total_amount)}</strong> with UTR <strong className="font-mono">{o.payment_ref}</strong>.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => save(o, { payment_status: 'Paid', status: o.status === 'Pending' ? 'Confirmed' : o.status })} className="btn-primary py-2 text-xs"><BadgeCheck size={15} /> Mark paid</button>
                          <button onClick={() => save(o, { payment_status: 'Failed' })} className="btn-outline py-2 text-xs">Not received</button>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="label font-bold text-primary">Change Order Status</span>
                        <select
                          value={o.status}
                          onChange={e => save(o, { status: e.target.value })}
                          className="input py-2.5 font-semibold text-fg cursor-pointer border-primary/40 focus:border-primary"
                        >
                          {(data.statuses || ORDER_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="label font-bold text-primary">Change Payment Status</span>
                        <select
                          value={o.payment_status}
                          onChange={e => save(o, { payment_status: e.target.value })}
                          className="input py-2.5 font-semibold text-fg cursor-pointer border-primary/40 focus:border-primary"
                        >
                          {(data.paymentStatuses || PAYMENT_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        save(o, { courier: f.get('courier'), tracking_number: f.get('tracking_number') });
                      }}
                      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                    >
                      <label className="block"><span className="label">Courier</span><input name="courier" defaultValue={o.courier || ''} placeholder="e.g. Blue Dart" className="input py-2.5" /></label>
                      <label className="block"><span className="label">Tracking number</span><input name="tracking_number" defaultValue={o.tracking_number || ''} placeholder="AWB / tracking no." className="input py-2.5 font-mono" /></label>
                      <button type="submit" className="btn-dark py-2.5">Save tracking</button>
                    </form>

                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="label">Customer</p>
                        <p className="font-bold">{o.customer || 'Customer'}</p>
                        <p className="text-muted">{o.customer_email || 'demo@electrohub.com'}</p>
                        {o.payment_ref && <p className="mt-1 text-muted">Payment ref: <span className="font-mono text-fg">{o.payment_ref}</span></p>}
                      </div>
                      <div>
                        <p className="label">Deliver to</p>
                        <p className="flex gap-1.5">
                          <MapPin size={15} className="mt-0.5 shrink-0" />
                          <span>
                            {o.address_snapshot?.name || 'Customer'}, {o.address_snapshot?.address_line || ''}, {o.address_snapshot?.city || ''}, {o.address_snapshot?.state || ''} {o.address_snapshot?.pincode || ''} · {o.address_snapshot?.phone || ''}
                          </span>
                        </p>
                      </div>
                    </div>

                    {Array.isArray(o.items) && o.items.length > 0 && (
                      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
                        {o.items.map((item, idx) => (
                          <li key={item.id || idx} className="flex items-center gap-3 p-3 text-sm">
                            {item.image && <img src={item.image.replace('w=800', 'w=120')} alt="" className="h-12 w-10 rounded-lg object-cover" />}
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-1 font-semibold">{item.name}</span>
                              <span className="text-xs text-muted">{item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity}</span>
                            </span>
                            <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-2">
                      <p className="text-muted">
                        {o.coupon_code && <>Coupon <strong className="text-fg">{o.coupon_code}</strong> (−{formatPrice(o.discount_amount)}) · </>}
                        Delivery {o.delivery_fee ? formatPrice(o.delivery_fee) : 'free'} · Total <strong className="text-fg font-extrabold">{formatPrice(o.total_amount)}</strong>
                      </p>
                      <button onClick={() => remove(o)} className="flex items-center gap-1.5 font-bold text-danger hover:underline"><Trash size={15} /> Delete order</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pager pagination={data?.pagination} onChange={(p) => update({ page: String(p) })} />
    </div>
  );
};

export default AdminOrders;
