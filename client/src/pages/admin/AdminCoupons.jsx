import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Skeletons';
import { formatDate, formatPrice } from '../../utils/format';
import { Badge, Field, Toggle, toInputDate } from './adminUi';

const EMPTY = { code: '', discount_type: 'PERCENTAGE', discount_value: '', min_order: 0, expires_at: '', is_active: true };

const CouponForm = ({ coupon, onSaved, onClose }) => {
  const [form, setForm] = useState(coupon ? { ...coupon, expires_at: toInputDate(coupon.expires_at), is_active: Boolean(coupon.is_active) } : EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = coupon ? await api.put(`/admin/coupons/${coupon.id}`, form) : await api.post('/admin/coupons', form);
      toast.success(res.data.message);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <Field label="Code" hint="Letters and numbers only, e.g. DIWALI25"><input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} className="input font-mono uppercase" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select value={form.discount_type} onChange={set('discount_type')} className="input">
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FLAT">Flat amount (₹)</option>
          </select>
        </Field>
        <Field label={form.discount_type === 'FLAT' ? 'Discount (₹)' : 'Discount (%)'}><input required type="number" min="1" max={form.discount_type === 'FLAT' ? undefined : 90} value={form.discount_value} onChange={set('discount_value')} className="input" /></Field>
        <Field label="Minimum order (₹)"><input type="number" min="0" value={form.min_order} onChange={set('min_order')} className="input" /></Field>
        <Field label="Expires on" hint="Leave empty for no expiry"><input type="datetime-local" value={form.expires_at} onChange={set('expires_at')} className="input" /></Field>
      </div>
      <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label={form.is_active ? 'Active' : 'Disabled'} />
      <div className="flex gap-3 border-t border-line pt-4">
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : coupon ? 'Save changes' : 'Create coupon'}</button>
        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
      </div>
    </form>
  );
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api.get('/admin/coupons').then(res => setCoupons(res.data.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await api.delete(`/admin/coupons/${c.id}`);
      toast.success('Coupon deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  };

  const expired = (c) => c.expires_at && new Date(c.expires_at.replace(' ', 'T') + 'Z') < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Coupons</h2>
        <button onClick={() => setEditing('new')} className="btn-primary py-2.5"><Plus size={18} /> Add coupon</button>
      </div>
      {!coupons ? <Spinner className="min-h-[30vh]" /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map(c => (
            <div key={c.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="rounded-lg border border-dashed border-line-strong px-3 py-1 font-mono text-lg font-extrabold">{c.code}</p>
                {expired(c) ? <Badge>Expired</Badge> : c.is_active ? <Badge className="bg-success-soft text-success">Active</Badge> : <Badge>Disabled</Badge>}
              </div>
              <p className="mt-3 font-bold">{c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% off` : `${formatPrice(c.discount_value)} off`} on orders above {formatPrice(c.min_order)}</p>
              <p className="mt-1 text-xs text-muted">{c.expires_at ? `Expires ${formatDate(c.expires_at)}` : 'No expiry'} · Used {c.times_used} time{c.times_used === 1 ? '' : 's'}</p>
              <div className="mt-4 flex gap-2 border-t border-line pt-3">
                <button onClick={() => setEditing(c)} className="btn-outline flex-1 py-2 text-xs"><Pencil size={14} /> Edit</button>
                <button onClick={() => remove(c)} className="btn-outline flex-1 py-2 text-xs text-danger"><Trash size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add coupon' : 'Edit coupon'}>
        {editing && <CouponForm key={editing === 'new' ? 'new' : editing.id} coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      </Modal>
    </div>
  );
};

export default AdminCoupons;
