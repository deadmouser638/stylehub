import React, { useContext } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LayoutGrid, Package, ShoppingBag, Tag, Megaphone, ArrowLeft, Boxes } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { Spinner } from '../../components/ui/Skeletons';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/offers', label: 'Offers', icon: Megaphone },
];

const AdminLayout = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'admin') {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Admins only</h1>
        <p className="mt-2 text-muted">Your account doesn't have access to the admin panel.</p>
        <Link to="/" className="btn-primary mt-6">Back to shop</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-6 md:py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">ElectroHub admin</p>
          <h1 className="font-display text-3xl font-semibold">Control panel</h1>
        </div>
        <Link to="/" className="btn-outline py-2.5"><ArrowLeft size={16} /> <span className="hidden sm:inline">Back to shop</span></Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0" aria-label="Admin sections">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${isActive ? 'bg-ink text-on-ink' : 'bg-surface hover:bg-surface-2 lg:bg-transparent'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
};

export default AdminLayout;
