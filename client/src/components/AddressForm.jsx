import React, { useState } from 'react';
import { House, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const emptyAddress = { name: '', phone: '', pincode: '', address_line: '', city: '', state: '', type: 'Home', is_default: false };

const Field = ({ label, id, className = '', ...props }) => (
  <div className={className}>
    <label htmlFor={id} className="label">{label}</label>
    <input id={id} className="input" {...props} />
  </div>
);

const AddressForm = ({ onSaved, onCancel }) => {
  const [form, setForm] = useState(emptyAddress);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.phone)) return toast.error('Please enter a valid 10-digit mobile number');
    if (!/^\d{6}$/.test(form.pincode)) return toast.error('Please enter a valid 6-digit pincode');

    setSaving(true);
    try {
      const res = await api.post('/addresses', form);
      toast.success('Address saved');
      onSaved?.(res.data.data.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5 animate-fade-in">
      <h3 className="font-extrabold">Add a new address</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" id="addr-name" name="name" required value={form.name} onChange={handleChange} autoComplete="name" />
        <Field label="Mobile number" id="addr-phone" name="phone" required inputMode="numeric" maxLength={10} value={form.phone} onChange={handleChange} autoComplete="tel-national" />
      </div>
      <Field label="Address (house no, building, street, area)" id="addr-line" name="address_line" required value={form.address_line} onChange={handleChange} autoComplete="street-address" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Pincode" id="addr-pincode" name="pincode" required inputMode="numeric" maxLength={6} value={form.pincode} onChange={handleChange} autoComplete="postal-code" />
        <Field label="City" id="addr-city" name="city" required value={form.city} onChange={handleChange} autoComplete="address-level2" />
        <Field label="State" id="addr-state" name="state" required value={form.state} onChange={handleChange} autoComplete="address-level1" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {[['Home', House], ['Work', Briefcase]].map(([t, Icon]) => (
          <label key={t} className={`chip cursor-pointer ${form.type === t ? 'chip-active' : ''}`}>
            <input type="radio" name="type" value={t} checked={form.type === t} onChange={handleChange} className="sr-only" />
            <Icon size={15} /> {t}
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold sm:ml-auto">
          <input type="checkbox" name="is_default" checked={form.is_default} onChange={handleChange} className="h-4 w-4 accent-[var(--accent)]" />
          Make this my default address
        </label>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save address'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-outline flex-1">Cancel</button>}
      </div>
    </form>
  );
};

export default AddressForm;
