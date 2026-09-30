import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, IndianRupee, Users, AlertTriangle, BadgeCheck, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import { Spinner } from '../../components/ui/Skeletons';
import { formatDate, formatPrice } from '../../utils/format';
import { Badge, ORDER_STATUS_STYLES, PAYMENT_STATUS_STYLES } from './adminUi';

const Stat = ({ icon: Icon, label, value, to, tone }) => (
  <Link to={to} className="card flex min-w-0 items-center gap-4 p-5 transition hover:border-fg">
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone || 'bg-surface-2'}`}><Icon size={22} /></span>
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="truncate text-2xl font-extrabold">{value}</p>
    </div>
  </Link>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(res.data.data)).catch(console.error);
  }, []);

  if (!stats) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={IndianRupee} label="Revenue" value={formatPrice(stats.revenue)} to="/admin/orders" />
        <Stat icon={ShoppingBag} label="Open orders" value={`${stats.pendingOrders} / ${stats.orders}`} to="/admin/orders" />
        <Stat icon={Package} label="Live products" value={stats.products} to="/admin/products" />
        <Stat icon={Users} label="Customers" value={stats.customers} to="/admin/orders" />
      </div>

      {(stats.paymentsToVerify > 0 || stats.lowStock > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.paymentsToVerify > 0 && (
            <Link to="/admin/orders?payment=Verifying" className="card flex min-w-0 items-center gap-3 border-accent p-4 font-bold">
              <BadgeCheck size={20} className="text-accent-text" /> {stats.paymentsToVerify} UPI payment{stats.paymentsToVerify > 1 ? 's' : ''} waiting for verification <ArrowRight size={16} className="ml-auto" />
            </Link>
          )}
          {stats.lowStock > 0 && (
            <Link to="/admin/products?status=low" className="card flex min-w-0 items-center gap-3 p-4 font-bold">
              <AlertTriangle size={20} className="text-warning" /> {stats.lowStock} products are low on stock <ArrowRight size={16} className="ml-auto" />
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-extrabold">Recent orders</h2>
            <Link to="/admin/orders" className="link text-sm">View all</Link>
          </div>
          {stats.recentOrders.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : (
            <ul className="divide-y divide-line">
              {stats.recentOrders.map(o => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
                  <span className="font-extrabold">#{o.id}</span>
                  <span className="min-w-0 flex-1 truncate">{o.customer} · <span className="text-muted">{formatDate(o.created_at)}</span></span>
                  <Badge className={PAYMENT_STATUS_STYLES[o.payment_status]}>{o.payment_method} · {o.payment_status}</Badge>
                  <Badge className={ORDER_STATUS_STYLES[o.status]}>{o.status}</Badge>
                  <span className="w-20 text-right font-extrabold">{formatPrice(o.total_amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card min-w-0 p-5">
          <h2 className="mb-4 font-extrabold">Products by category</h2>
          <ul className="space-y-3">
            {stats.byCategory.map(c => (
              <li key={c.category}>
                <Link to={`/admin/products?category=${encodeURIComponent(c.category)}`} className="flex items-center justify-between text-sm hover:text-accent-text">
                  <span className="font-bold">{c.category}</span>
                  <span className="text-muted">{c.count} products · {c.stock} in stock</span>
                </Link>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(c.count / Math.max(...stats.byCategory.map(x => x.count))) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {stats.lowStockProducts.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-4 font-extrabold">Low stock</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.lowStockProducts.map(p => (
              <Link key={p.id} to={`/admin/products?search=${p.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-line p-2.5 hover:border-fg">
                <img src={p.images[0]?.replace('w=800', 'w=120')} alt="" className="h-12 w-10 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className={`text-xs font-bold ${p.stock === 0 ? 'text-danger' : 'text-warning'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;
