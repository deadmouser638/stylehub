import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash, Search, ArchiveRestore, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Skeletons';
import { formatPrice, sellingPrice } from '../../utils/format';
import { Badge, Field, Pager, Toggle } from './adminUi';

const EMPTY = { name: '', brand: '', category: '', subcategory: '', gender: 'Unisex', price: '', discount_percent: 0, stock: 10, colors: '', sizes: '', images: '', specs: '', description: '', is_active: true };

const ProductForm = ({ product, initial, categories, onSaved, onClose }) => {
  const [form, setForm] = useState(() => product ? {
    ...product,
    colors: product.colors.join(', '),
    sizes: product.sizes.join(', '),
    images: product.images.join('\n'),
    specs: Object.entries(product.specs || {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
    is_active: Boolean(product.is_active),
  } : { ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const subOptions = categories.find(c => c.name === form.category)?.subcategories || [];
  const imageList = form.images.split(/\n|,/).map(s => s.trim()).filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = product ? await api.put(`/admin/products/${product.id}`, form) : await api.post('/admin/products', form);
      toast.success(res.data.message);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" className="sm:col-span-2"><input required value={form.name} onChange={set('name')} className="input" /></Field>
        <Field label="Brand"><input required value={form.brand} onChange={set('brand')} className="input" /></Field>
        <Field label="Colour" hint="e.g. Black"><input value={form.colors} onChange={set('colors')} className="input" /></Field>
        <Field label="Category" hint="Pick one or type a new category">
          <input required list="admin-categories" value={form.category} onChange={set('category')} className="input" />
          <datalist id="admin-categories">{categories.map(c => <option key={c.name} value={c.name} />)}</datalist>
        </Field>
        <Field label="Subcategory" hint="Pick one or type a new subcategory">
          <input required list="admin-subcategories" value={form.subcategory} onChange={set('subcategory')} className="input" />
          <datalist id="admin-subcategories">{subOptions.map(s => <option key={s.name} value={s.name} />)}</datalist>
        </Field>
        <Field label="MRP (₹)"><input required type="number" min="1" step="1" value={form.price} onChange={set('price')} className="input" /></Field>
        <Field label="Discount (%)" hint={form.price ? `Selling price: ${formatPrice(sellingPrice({ price: Number(form.price), discount_percent: Number(form.discount_percent) || 0 }))}` : ''}>
          <input type="number" min="0" max="95" value={form.discount_percent} onChange={set('discount_percent')} className="input" />
        </Field>
        <Field label="Stock" hint="Changes are logged in Inventory"><input required type="number" min="0" value={form.stock} onChange={set('stock')} className="input" /></Field>
        <Field label="Specifications" hint="One per line as Name: Value, e.g. RAM: 8 GB. These power the specification filters." className="sm:col-span-2">
          <textarea rows={6} value={form.specs} onChange={set('specs')} placeholder={'RAM: 8 GB\nStorage: 256 GB\nDisplay: 6.7 inch AMOLED\nWarranty: 1 Year Manufacturer Warranty'} className="input font-mono text-xs" />
        </Field>
        <Field label="Image URLs" hint="One per line. The first image is the main photo." className="sm:col-span-2">
          <textarea required rows={3} value={form.images} onChange={set('images')} className="input font-mono text-xs" />
        </Field>
        {imageList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto sm:col-span-2">
            {imageList.map((src, i) => <img key={src + i} src={src} alt="" className="h-20 w-16 shrink-0 rounded-lg bg-surface-2 object-cover" />)}
          </div>
        )}
        <Field label="Description" className="sm:col-span-2"><textarea rows={3} value={form.description} onChange={set('description')} className="input" /></Field>
      </div>
      <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label={form.is_active ? 'Visible in shop' : 'Hidden (archived)'} />
      <div className="flex gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}</button>
        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
      </div>
    </form>
  );
};

const AdminProducts = () => {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null); // product object, or 'new'
  const [search, setSearch] = useState(params.get('search') || '');

  const category = params.get('category') || '';
  const subcategory = params.get('subcategory') || '';
  const status = params.get('status') || 'active';
  const page = Number(params.get('page')) || 1;
  const query = params.toString();

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const loadCategories = () => api.get('/admin/products/categories').then(res => setCategories(res.data.data)).catch(console.error);
  const load = useCallback(() => {
    const p = new URLSearchParams(query);
    if (!p.get('status')) p.set('status', 'active');
    api.get(`/admin/products?${p.toString()}`).then(res => setData(res.data.data)).catch(err => toast.error(err.response?.data?.message || 'Could not load products'));
  }, [query]);

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? Products with past orders are archived instead.`)) return;
    try {
      const res = await api.delete(`/admin/products/${p.id}`);
      toast.success(res.data.message);
      load(); loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  };

  const restore = async (p) => {
    try {
      await api.put(`/admin/products/${p.id}`, { is_active: true });
      toast.success('Product restored to the shop');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not restore');
    }
  };

  const subcats = categories.find(c => c.name === category)?.subcategories || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Products {data && <span className="font-sans text-base text-muted">({data.pagination.total})</span>}</h2>
        <button onClick={() => setEditing('new')} className="btn-primary py-2.5"><Plus size={18} /> Add product</button>
      </div>

      {/* Category tabs */}
      <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Category">
        {[{ name: '', count: categories.reduce((n, c) => n + c.count, 0) }, ...categories].map(c => (
          <button key={c.name || 'all'} role="tab" aria-selected={category === c.name} onClick={() => update({ category: c.name, subcategory: '' })} className={`chip shrink-0 ${category === c.name ? 'chip-active' : ''}`}>
            {c.name || 'All'} <span className={category === c.name ? 'opacity-80' : 'text-muted'}>{c.count}</span>
          </button>
        ))}
      </div>

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <form onSubmit={(e) => { e.preventDefault(); update({ search }); }} className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, brand or ID" aria-label="Search products" className="input py-2.5 pl-10" />
        </form>
        {subcats.length > 0 && (
          <select value={subcategory} onChange={e => update({ subcategory: e.target.value })} className="input py-2.5 sm:w-52" aria-label="Subcategory">
            <option value="">All subcategories</option>
            {subcats.map(s => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
          </select>
        )}
        <select value={status} onChange={e => update({ status: e.target.value })} className="input py-2.5 sm:w-40" aria-label="Status">
          <option value="active">Live</option>
          <option value="low">Low stock</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {!data ? <Spinner className="min-h-[30vh]" /> : data.products.length === 0 ? (
        <p className="card p-8 text-center text-muted">No products match these filters.</p>
      ) : (
        <>
          {/* Table on larger screens */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.products.map(p => (
                  <tr key={p.id} className="align-middle">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images[0]?.replace('w=800', 'w=120')} alt="" className="h-14 w-11 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 max-w-xs">
                          <p className="truncate font-bold">{p.name}</p>
                          <p className="text-xs text-muted">#{p.id} · {p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><p className="font-semibold">{p.subcategory}</p><p className="text-xs text-muted">{p.category}</p></td>
                    <td className="p-3"><p className="font-bold">{formatPrice(sellingPrice(p))}</p><p className="text-xs text-muted">MRP {formatPrice(p.price)} · {Math.round(p.discount_percent)}% off</p></td>
                    <td className={`p-3 font-bold ${p.stock === 0 ? 'text-danger' : p.stock <= 5 ? 'text-warning' : ''}`}>{p.stock}</td>
                    <td className="p-3">{p.is_active ? <Badge className="bg-success-soft text-success">Live</Badge> : <Badge>Archived</Badge>}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <a href={`/product/${p.id}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" aria-label={`View ${p.name} in shop`}><ExternalLink size={16} /></a>
                        {!p.is_active && <button onClick={() => restore(p)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" aria-label={`Restore ${p.name}`}><ArchiveRestore size={16} /></button>}
                        <button onClick={() => setEditing(p)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" aria-label={`Edit ${p.name}`}><Pencil size={16} /></button>
                        <button onClick={() => remove(p)} className="grid h-9 w-9 place-items-center rounded-full text-danger hover:bg-surface-2" aria-label={`Delete ${p.name}`}><Trash size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards on phones */}
          <ul className="space-y-3 md:hidden">
            {data.products.map(p => (
              <li key={p.id} className="card flex gap-3 p-3">
                <img src={p.images[0]?.replace('w=800', 'w=160')} alt="" className="h-24 w-18 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-muted">#{p.id} · {p.subcategory}</p>
                  <p className="mt-1 text-sm font-extrabold">{formatPrice(sellingPrice(p))} <span className={`ml-2 text-xs ${p.stock <= 5 ? 'text-danger' : 'text-muted'}`}>Stock {p.stock}</span></p>
                  <div className="mt-2 flex items-center gap-2">
                    {p.is_active ? <Badge className="bg-success-soft text-success">Live</Badge> : <Badge>Archived</Badge>}
                    <div className="ml-auto flex gap-1">
                      {!p.is_active && <button onClick={() => restore(p)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2" aria-label="Restore"><ArchiveRestore size={15} /></button>}
                      <button onClick={() => setEditing(p)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2" aria-label="Edit"><Pencil size={15} /></button>
                      <button onClick={() => remove(p)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-danger" aria-label="Delete"><Trash size={15} /></button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pager pagination={data.pagination} onChange={(p) => update({ page: String(p) })} />
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add product' : 'Edit product'} variant="wide" className="max-w-3xl">
        {editing && (
          <ProductForm
            key={editing === 'new' ? 'new' : editing.id}
            product={editing === 'new' ? null : editing}
            initial={{ category, subcategory }}
            categories={categories}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); loadCategories(); }}
          />
        )}
      </Modal>
    </div>
  );
};

export default AdminProducts;
