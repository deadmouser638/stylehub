import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Trash, ChevronDown, BadgeCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Spinner } from '../../components/ui/Skeletons';
import { formatDate, formatPrice } from '../../utils/format';
import { Badge, Pager, ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES } from './adminUi';

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

  const load = useCallback(() => {
    api.get(`/admin/orders?${query}`).then(res => setData(res.data.data)).catch(err => toast.error(err.response?.data?.message || 'Could not load orders'));
  }, [query]);
  useEffect(() => { load(); }, [load]);

  const save = async (order, changes) => {
    if (changes.status === 'Cancelled' && !window.confirm(`Cancel order #${order.id}? Its items go back into stock.`)) return;
    try {
      await api.put(`/admin/orders/${order.id}`, changes);
      toast.success(`Order #${order.id} updated`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update order');
    }
  };

  const remove = async (order) => {
    if (!window.confirm(`Permanently delete order #${order.id}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/orders/${order.id}`);
      toast.success('Order deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete order');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-semibold">Orders {data && <span className="font-sans text-base text-muted">({data.pagination.total})</span>}</h2>

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); update({ search }); }} className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Order #, customer, email or UTR" aria-label="Search orders" className="input py-2.5 pl-10" />
        </form>
        <select value={params.get('status') || ''} onChange={e => update({ status: e.target.value })} className="input py-2.5 sm:w-44" aria-label="Order status">
          <option value="">All statuses</option>
          {data?.statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={params.get('payment') || ''} onChange={e => update({ payment: e.target.value })} className="input py-2.5 sm:w-48" aria-label="Payment status">
          <option value="">All payments</option>
          {data?.paymentStatuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {!data ? <Spinner className="min-h-[30vh]" /> : data.orders.length === 0 ? (
        <p className="card p-8 text-center text-muted">No orders match these filters.</p>
      ) : (
        <ul className="space-y-3">
          {data.orders.map(o => {
            const expanded = open === o.id;
            return (
              <li key={o.id} className="card overflow-hidden">
                <button onClick={() => setOpen(expanded ? null : o.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left" aria-expanded={expanded}>
                  <span className="font-extrabold">#{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{o.customer} <span className="text-muted">· {formatDate(o.created_at)}</span></span>
                  <Badge className={PAYMENT_STATUS_STYLES[o.payment_status]}>{o.payment_method} · {o.payment_status}</Badge>
                  <Badge className={ORDER_STATUS_STYLES[o.status]}>{o.status}</Badge>
                  <span className="font-extrabold">{formatPrice(o.total_amount)}</span>
                  <ChevronDown size={18} className={`text-muted transition ${expanded ? 'rotate-180' : ''}`} />
                </button>

                {expanded && (
                  <div className="space-y-4 border-t border-line p-4 animate-fade-in">
                    {o.payment_status === 'Verifying' && (
                      <div className="flex flex-col gap-3 rounded-2xl bg-accent-soft p-4 sm:flex-row sm:items-center">
                        <p className="flex-1 text-sm">
                          <strong>Check your bank/UPI app</strong> for a payment of <strong>{formatPrice(o.total_amount)}</strong> with UTR <strong className="font-mono">{o.payment_ref}</strong>.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => save(o, { payment_status: 'Paid', status: o.status === 'Pending' ? 'Confirmed' : o.status })} className="btn-primary py-2 text-xs"><BadgeCheck size={15} /> Mark paid</button>
                          <button onClick={() => save(o, { payment_status: 'Failed' })} className="btn-outline py-2 text-xs">Not received</button>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="label">Order status</span>
                        <select value={o.status} onChange={e => save(o, { status: e.target.value })} disabled={o.status === 'Cancelled'} className="input py-2.5">
                          {data.statuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="label">Payment status</span>
                        <select value={o.payment_status} onChange={e => save(o, { payment_status: e.target.value })} className="input py-2.5">
                          {data.paymentStatuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>

                    <form
                      onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save(o, { courier: f.get('courier'), tracking_number: f.get('tracking_number') }); }}
                      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                    >
                      <label className="block"><span className="label">Courier</span><input name="courier" defaultValue={o.courier || ''} placeholder="e.g. Blue Dart" className="input py-2.5" /></label>
                      <label className="block"><span className="label">Tracking number</span><input name="tracking_number" defaultValue={o.tracking_number || ''} placeholder="AWB / tracking no." className="input py-2.5 font-mono" /></label>
                      <button type="submit" className="btn-dark py-2.5">Save tracking</button>
                    </form>

                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="label">Customer</p>
                        <p className="font-bold">{o.customer}</p>
                        <p className="text-muted">{o.customer_email}</p>
                        {o.payment_ref && <p className="mt-1 text-muted">Payment ref: <span className="font-mono text-fg">{o.payment_ref}</span></p>}
                      </div>
                      <div>
                        <p className="label">Deliver to</p>
                        <p className="flex gap-1.5"><MapPin size={15} className="mt-0.5 shrink-0" /> <span>{o.address_snapshot.name}, {o.address_snapshot.address_line}, {o.address_snapshot.city}, {o.address_snapshot.state} {o.address_snapshot.pincode} · {o.address_snapshot.phone}</span></p>
                      </div>
                    </div>

                    <ul className="divide-y divide-line rounded-2xl border border-line">
                      {o.items.map(item => (
                        <li key={item.id} className="flex items-center gap-3 p-3 text-sm">
                          {item.image && <img src={item.image.replace('w=800', 'w=120')} alt="" className="h-12 w-10 rounded-lg object-cover" />}
                          <span className="min-w-0 flex-1"><span className="line-clamp-1 font-semibold">{item.name}</span><span className="text-xs text-muted">{item.size ? `Size ${item.size} · ` : ''}Qty {item.quantity}</span></span>
                          <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <p className="text-muted">
                        {o.coupon_code && <>Coupon <strong className="text-fg">{o.coupon_code}</strong> (−{formatPrice(o.discount_amount)}) · </>}
                        Delivery {o.delivery_fee ? formatPrice(o.delivery_fee) : 'free'} · Total <strong className="text-fg">{formatPrice(o.total_amount)}</strong>
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
