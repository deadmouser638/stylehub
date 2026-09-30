import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, KeyRound, Palette, LogOut, Package, Heart, LayoutGrid, Plus, Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { WishlistContext } from '../context/WishlistContext';
import { CartContext } from '../context/CartContext';
import AddressForm from '../components/AddressForm';
import { ThemeSelector } from '../components/ThemeToggle';
import api from '../utils/api';
import { formatDate } from '../utils/format';

const SavedAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      setAddresses(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.delete(`/addresses/${id}`);
      toast.success('Address deleted');
      loadAddresses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/addresses/${id}/default`);
      loadAddresses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update address');
    }
  };

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !showForm && <p className="text-muted">You don't have any saved addresses yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {addresses.map(addr => (
          <div key={addr.id} className="card p-5">
            <p className="flex items-center gap-2 font-extrabold">
              {addr.name}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold">{addr.type}</span>
              {addr.is_default ? <span className="text-[11px] font-bold text-accent-text">DEFAULT</span> : null}
            </p>
            <p className="mt-2 text-sm text-muted">{addr.address_line}</p>
            <p className="text-sm text-muted">{addr.city}, {addr.state} – {addr.pincode}</p>
            <p className="mt-1 text-sm">Mobile: <strong>{addr.phone}</strong></p>
            <div className="mt-4 flex gap-4 text-sm font-bold">
              {!addr.is_default && <button onClick={() => handleSetDefault(addr.id)} className="link">Make default</button>}
              <button onClick={() => handleDelete(addr.id)} className="flex items-center gap-1 text-muted hover:text-danger"><Trash size={14} /> Delete</button>
            </div>
          </div>
        ))}
      </div>
      {showForm ? (
        <AddressForm onSaved={() => { setShowForm(false); loadAddresses(); }} onCancel={() => setShowForm(false)} />
      ) : (
        <button onClick={() => setShowForm(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong py-4 font-bold transition hover:border-fg">
          <Plus size={18} /> Add new address
        </button>
      )}
    </div>
  );
};

const ChangePassword = () => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (form.newPassword !== form.confirmPassword) return toast.error('New passwords do not match');

    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, autoComplete) => (
    <div>
      <label htmlFor={`pw-${name}`} className="label">{label}</label>
      <input id={`pw-${name}`} type="password" required autoComplete={autoComplete} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} className="input" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      {field('currentPassword', 'Current password', 'current-password')}
      {field('newPassword', 'New password', 'new-password')}
      {field('confirmPassword', 'Confirm new password', 'new-password')}
      <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Change password'}</button>
    </form>
  );
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'profile', label: 'Edit profile', icon: User },
  { key: 'addresses', label: 'Saved addresses', icon: MapPin },
  { key: 'password', label: 'Change password', icon: KeyRound },
  { key: 'appearance', label: 'Appearance', icon: Palette },
];

const Profile = () => {
  const { user, logout, setUser } = useContext(AuthContext);
  const { wishlist } = useContext(WishlistContext);
  const { cart } = useContext(CartContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState({ name: user?.name || '', phone: user?.phone || '', gender: user?.gender || '' });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) return toast.error('Name cannot be empty');
    try {
      const res = await api.put('/auth/me', profileData);
      setUser(res.data.data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const active = TABS.find(t => t.key === activeTab);

  return (
    <div className="container-x py-8 md:py-12">
      <div className="card mb-8 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent text-2xl font-extrabold text-on-accent">{user?.name?.[0]?.toUpperCase()}</span>
        <div className="w-full min-w-0 flex-1 sm:w-auto">
          <h1 className="truncate font-display text-2xl font-semibold">{user?.name}</h1>
          <p className="truncate text-sm text-muted">{user?.email}{user?.created_at ? ` · Member since ${formatDate(user.created_at, { month: 'long', year: 'numeric' })}` : ''}</p>
        </div>
        <button onClick={logout} className="btn-outline py-2.5"><LogOut size={16} /> Log out</button>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <nav className="hide-scrollbar flex gap-2 overflow-x-auto md:flex-col md:gap-1" aria-label="Account sections">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${activeTab === key ? 'bg-ink text-on-ink' : 'hover:bg-surface-2'}`} aria-current={activeTab === key ? 'page' : undefined}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        <section className="card p-6 md:p-8">
          <h2 className="mb-6 font-display text-2xl font-semibold">{active.label}</h2>

          {activeTab === 'overview' && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { to: '/orders', icon: Package, title: 'Orders', text: 'Track, cancel or buy again' },
                { to: '/wishlist', icon: Heart, title: `Wishlist (${wishlist.length})`, text: 'Your saved favourites' },
                { to: '/cart', icon: LayoutGrid, title: `Bag (${cart.length})`, text: 'Ready to check out' },
              ].map(({ to, icon: Icon, title, text }) => (
                <Link key={to} to={to} className="card p-5 transition hover:border-fg">
                  <Icon size={22} />
                  <p className="mt-4 font-extrabold">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </Link>
              ))}
              <button onClick={() => setActiveTab('addresses')} className="card p-5 text-left transition hover:border-fg">
                <MapPin size={22} />
                <p className="mt-4 font-extrabold">Addresses</p>
                <p className="text-sm text-muted">Manage delivery addresses</p>
              </button>
              <button onClick={() => setActiveTab('appearance')} className="card p-5 text-left transition hover:border-fg">
                <Palette size={22} />
                <p className="mt-4 font-extrabold">Appearance</p>
                <p className="text-sm text-muted">Light, dark or system theme</p>
              </button>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="max-w-md space-y-4">
              <div>
                <label htmlFor="p-name" className="label">Full name</label>
                <input id="p-name" required value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} className="input" />
              </div>
              <div>
                <label htmlFor="p-email" className="label">Email</label>
                <input id="p-email" type="email" value={user?.email || ''} disabled className="input cursor-not-allowed bg-surface-2 text-muted" />
              </div>
              <div>
                <label htmlFor="p-phone" className="label">Phone</label>
                <input id="p-phone" inputMode="tel" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} className="input" />
              </div>
              <div>
                <label htmlFor="p-gender" className="label">Gender</label>
                <select id="p-gender" value={profileData.gender} onChange={e => setProfileData({ ...profileData, gender: e.target.value })} className="input">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">Save changes</button>
            </form>
          )}

          {activeTab === 'addresses' && <SavedAddresses />}
          {activeTab === 'password' && <ChangePassword />}

          {activeTab === 'appearance' && (
            <div className="max-w-md">
              <p className="mb-4 text-sm text-muted">Choose how ElectroHub looks. “System” follows your device setting automatically.</p>
              <ThemeSelector />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
