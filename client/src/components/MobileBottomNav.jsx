import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { House, LayoutGrid, Search, Heart, User } from 'lucide-react';
import { UIContext } from '../context/UIContext';
import { WishlistContext } from '../context/WishlistContext';
import { AuthContext } from '../context/AuthContext';

// App-style tab bar shown on phones
const MobileBottomNav = () => {
  const { openSearch } = useContext(UIContext);
  const { wishlist } = useContext(WishlistContext);
  const { user } = useContext(AuthContext);

  const item = ({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition ${isActive ? 'text-accent-text' : 'text-muted'}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Quick navigation">
      <div className="flex">
        <NavLink to="/" end className={item}><House size={21} /> Home</NavLink>
        <NavLink to="/products" end className={item}><LayoutGrid size={21} /> Shop</NavLink>
        <button onClick={openSearch} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold text-muted"><Search size={21} /> Search</button>
        <NavLink to="/wishlist" className={item}>
          <span className="relative">
            <Heart size={21} />
            {wishlist.length > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" aria-hidden="true" />}
          </span>
          Wishlist
        </NavLink>
        <NavLink to={user ? '/profile' : '/login'} className={item}><User size={21} /> {user ? 'Account' : 'Login'}</NavLink>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
