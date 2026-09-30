import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash, Image, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Skeletons';
import { formatDate } from '../../utils/format';
import { Badge, Field, Toggle, toInputDate } from './adminUi';

const EMPTY = { title: '', subtitle: '', cta_label: 'Shop now', link: '/products', image: '', placement: 'hero', position: 0, is_active: true, starts_at: '', ends_at: '' };

const OfferForm = ({ offer, onSaved, onClose }) => {
  const [form, setForm] = useState(offer ? { ...offer, starts_at: toInputDate(offer.starts_at), ends_at: toInputDate(offer.ends_at), is_active: Boolean(offer.is_active) } : EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const hero = form.placement === 'hero';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = offer ? await api.put(`/admin/offers/${offer.id}`, form) : await api.post('/admin/offers', form);
      toast.success(res.data.message);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save offer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Where to show">
        {[['hero', 'Home page banner', Image], ['ticker', 'Header ticker', Megaphone]].map(([value, label, Icon]) => (
          <button key={value} type="button" role="radio" aria-checked={form.placement === value} onClick={() => setForm({ ...form, placement: value })} className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold ${form.placement === value ? 'border-fg bg-ink text-on-ink' : 'border-line-strong'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <Field label={hero ? 'Headline' : 'Message'}><input required value={form.title} onChange={set('title')} className="input" /></Field>
      {hero && (
        <>
          <Field label="Subtitle"><input value={form.subtitle} onChange={set('subtitle')} className="input" /></Field>
          <Field label="Image URL"><input required type="url" value={form.image} onChange={set('image')} className="input" /></Field>
          {form.image && <img src={form.image} alt="" className="h-32 w-full rounded-xl object-cover" />}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Button text"><input value={form.cta_label} onChange={set('cta_label')} className="input" /></Field>
            <Field label="Link" hint="e.g. /products/Women"><input value={form.link} onChange={set('link')} className="input" /></Field>
          </div>
        </>
      )}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Order" hint="Lower first"><input type="number" value={form.position} onChange={set('position')} className="input" /></Field>
        <Field label="Starts"><input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} className="input px-2" /></Field>
        <Field label="Ends"><input type="datetime-local" value={form.ends_at} onChange={set('ends_at')} className="input px-2" /></Field>
      </div>
      <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label={form.is_active ? 'Showing on site' : 'Hidden'} />
      <div className="flex gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : offer ? 'Save changes' : 'Create offer'}</button>
        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
      </div>
    </form>
  );
};

const AdminOffers = () => {
  const [offers, setOffers] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api.get('/admin/offers').then(res => setOffers(res.data.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  const remove = async (o) => {
    if (!window.confirm(`Delete offer "${o.title}"?`)) return;
    try {
      await api.delete(`/admin/offers/${o.id}`);
      toast.success('Offer deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  };

  const section = (placement, title, hint) => {
    const list = (offers || []).filter(o => o.placement === placement);
    return (
      <section>
        <h3 className="font-extrabold">{title}</h3>
        <p className="mb-3 text-sm text-muted">{hint}</p>
        {list.length === 0 ? <p className="card p-5 text-sm text-muted">None yet.</p> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map(o => (
              <li key={o.id} className="card flex min-w-0 gap-3 p-3">
                {o.image && <img src={o.image} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 font-bold">{o.title}</p>
                    {o.is_active ? <Badge className="bg-success-soft text-success">Live</Badge> : <Badge>Hidden</Badge>}
                  </div>
                  {o.subtitle && <p className="truncate text-sm text-muted">{o.subtitle}</p>}
                  <p className="mt-1 break-all text-xs text-muted">Order {o.position}{o.ends_at ? ` · ends ${formatDate(o.ends_at)}` : ''}{o.link ? ` · ${o.link}` : ''}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setEditing(o)} className="btn-outline px-3 py-1.5 text-xs"><Pencil size={13} /> Edit</button>
                    <button onClick={() => remove(o)} className="btn-outline px-3 py-1.5 text-xs text-danger"><Trash size={13} /> Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Offers</h2>
        <button onClick={() => setEditing('new')} className="btn-primary py-2.5"><Plus size={18} /> Add offer</button>
      </div>
      {!offers ? <Spinner className="min-h-[30vh]" /> : (
        <>
          {section('hero', 'Home page banners', 'The first four live banners appear in the hero at the top of the home page.')}
          {section('ticker', 'Header ticker', 'Short messages that scroll across the top of every page.')}
        </>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add offer' : 'Edit offer'}>
        {editing && <OfferForm key={editing === 'new' ? 'new' : editing.id} offer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      </Modal>
    </div>
  );
};

export default AdminOffers;
