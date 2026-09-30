import React, { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Minus, Boxes, IndianRupee, AlertTriangle, PackageX } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { Spinner } from '../../components/ui/Skeletons';
import { formatPrice, parseDbDate } from '../../utils/format';
import { Pager } from './adminUi';

const StockRow = ({ product, onChanged }) => {
  const [qty, setQty] = useState(10);
  const [busy, setBusy] = useState(false);

  const adjust = async (sign) => {
    const change = sign * Math.abs(Math.round(Number(qty) || 0));
    if (!change) return toast.error('Enter a quantity');
    setBusy(true);
    try {
      const res = await api.post(`/admin/inventory/${product.id}/adjust`, { change, reason: sign > 0 ? 'Restock' : 'Stock correction' });
      toast.success(`${product.brand}: stock now ${res.data.data.stock}`);
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update stock');
    } finally {
      setBusy(false);
    }
  };

  const tone = product.stock === 0 ? 'text-danger' : product.stock <= 5 ? 'text-warning' : 'text-success';
  return (
    <li className="card flex flex-wrap items-center gap-3 p-3">
      <img src={product.images[0]?.replace('w=800', 'w=120')} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-bold">{product.name}</p>
        <p className="text-xs text-muted">#{product.id} · {product.category} · {formatPrice(product.price * (100 - product.discount_percent) / 100)}</p>
      </div>
      <p className={`w-20 text-center text-lg font-extrabold ${tone}`}>{product.stock}<span className="block text-[10px] font-bold uppercase text-muted">in stock</span></p>
      <div className="flex items-center gap-1.5">
        <button onClick={() => adjust(-1)} disabled={busy} className="grid h-9 w-9 place-items-center rounded-full border border-line-strong hover:border-fg" aria-label={`Remove stock from ${product.name}`}><Minus size={15} /></button>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} className="input w-16 px-2 py-1.5 text-center" aria-label="Quantity" />
        <button onClick={() => adjust(1)} disabled={busy} className="grid h-9 w-9 place-items-center rounded-full bg-ink text-on-ink" aria-label={`Add stock to ${product.name}`}><Plus size={15} /></button>
      </div>
    </li>
  );
};

const AdminInventory = () => {
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState(null);
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({ status: 'low', category: '', search: '', page: 1 });
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    api.get('/admin/inventory/summary').then(res => setSummary(res.data.data)).catch(console.error);
    api.get('/admin/inventory/movements').then(res => setMovements(res.data.data)).catch(console.error);
    api.get('/admin/products', { params: { ...filters, status: filters.status, sort: 'stock_asc', limit: 15 } })
      .then(res => setData(res.data.data)).catch(err => toast.error(err.response?.data?.message || 'Could not load inventory'));
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const set = (changes) => setFilters(f => ({ ...f, page: 1, ...changes }));

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">Inventory</h2>

      {summary && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            [Boxes, 'Units in stock', summary.units.toLocaleString('en-IN')],
            [IndianRupee, 'Stock value', formatPrice(summary.value)],
            [AlertTriangle, 'Low stock (1-5)', summary.lowStock],
            [PackageX, 'Out of stock', summary.outOfStock],
          ].map(([Icon, label, value]) => (
            <div key={label} className="card flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2"><Icon size={18} /></span>
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p><p className="truncate text-lg font-extrabold">{value}</p></div>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ category: '' }, ...summary.byCategory].map(c => (
            <button key={c.category || 'all'} onClick={() => set({ category: c.category })} className={`chip shrink-0 ${filters.category === c.category ? 'chip-active' : ''}`}>
              {c.category || 'All'} {c.category && <span className={filters.category === c.category ? 'opacity-80' : 'text-muted'}>{c.units} units</span>}
            </button>
          ))}
        </div>
      )}

      <div className="card flex flex-col gap-3 p-3 sm:flex-row">
        <form onSubmit={(e) => { e.preventDefault(); set({ search }); }} className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, brand or ID" aria-label="Search inventory" className="input py-2.5 pl-10" />
        </form>
        <select value={filters.status} onChange={e => set({ status: e.target.value })} className="input py-2.5 sm:w-48" aria-label="Stock filter">
          <option value="low">Low stock (≤ 5)</option>
          <option value="out">Out of stock</option>
          <option value="active">All live products</option>
        </select>
      </div>

      {!data ? <Spinner className="min-h-[20vh]" /> : data.products.length === 0 ? (
        <p className="card p-6 text-center text-muted">Nothing here. Stock levels look healthy.</p>
      ) : (
        <>
          <ul className="space-y-2">{data.products.map(p => <StockRow key={p.id} product={p} onChanged={load} />)}</ul>
          <Pager pagination={data.pagination} onChange={(page) => setFilters(f => ({ ...f, page }))} />
        </>
      )}

      <section className="card p-4">
        <h3 className="mb-3 font-extrabold">Recent stock movements</h3>
        <ul className="divide-y divide-line text-sm">
          {movements.slice(0, 25).map(m => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <span className={`w-12 shrink-0 text-right font-extrabold ${m.change > 0 ? 'text-success' : 'text-danger'}`}>{m.change > 0 ? `+${m.change}` : m.change}</span>
              <span className="min-w-0 flex-1"><span className="line-clamp-1 font-semibold">{m.name}</span><span className="text-xs text-muted">{m.reason}{m.reference ? ` · ${m.reference}` : ''}</span></span>
              <span className="shrink-0 text-right text-xs text-muted">Stock {m.stock_after}<br />{parseDbDate(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminInventory;
