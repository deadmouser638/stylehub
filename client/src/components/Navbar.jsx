import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Search, User, Heart, ShoppingBag, Menu, Camera, ChevronDown, Package, LogOut, ArrowRight, Truck, Tag, RotateCcw, Sparkles, LayoutGrid, Megaphone } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { CartContext } from '../context/CartContext';
import { WishlistContext } from '../context/WishlistContext';
import { UIContext } from '../context/UIContext';
import { CatalogContext, categoryPath } from '../context/CatalogContext';
import { ThemeToggle, ThemeSelector } from './ThemeToggle';
import Modal from './ui/Modal';

const ANNOUNCEMENTS = [
  { icon: Truck, text: 'Free delivery on orders above ₹999' },
  { icon: Tag, text: 'Use code WELCOME10 for 10% off your first order' },
  { icon: RotateCcw, text: 'Brand warranty on every product · 7-day replacement' },
  { icon: Camera, text: 'New: search with a photo from your camera or gallery' },
  { icon: Sparkles, text: 'Flat ₹1,000 off above ₹15,000 with FLAT1000' },
];

const PLACEHOLDERS = ['iPhone 15', 'iPad Air', 'gaming laptop', 'noise cancelling headphones', 'smartwatch', '20000 mAh power bank', '55 inch 4K TV', '1.5 ton AC'];

const Logo = ({ className = '' }) => (
  <Link to="/" className={`font-display text-2xl font-bold tracking-tight text-fg md:text-[28px] ${className}`} aria-label="ElectroHub home">
    Electro<span className="text-accent-text">Hub</span><span className="text-accent-text">.</span>
  </Link>
);

const CountBadge = ({ count }) => count > 0 && (
  <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-on-accent" aria-hidden="true">
    {count > 99 ? '99+' : count}
  </span>
);

const MegaMenu = ({ category, onNavigate }) => {
  const featured = [...category.subcategories].sort((a, b) => b.maxDiscount - a.maxDiscount).slice(0, 2);
  return (
    <div className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-float animate-fade-in">
      <div className="container-x grid grid-cols-[1fr_auto] gap-10 py-8">
        <div>
          <Link to={categoryPath(category.name)} onClick={onNavigate} className="eyebrow inline-flex items-center gap-1 hover:underline">
            Shop all {category.name} <ArrowRight size={14} />
          </Link>
          <ul className="mt-5 grid grid-cols-3 gap-x-8 gap-y-3 xl:grid-cols-4">
            {category.subcategories.map(sub => (
              <li key={sub.name}>
                <Link to={categoryPath(category.name, sub.name)} onClick={onNavigate} className="group flex items-baseline gap-2 text-sm font-semibold text-fg">
                  <span className="group-hover:text-accent-text group-hover:underline">{sub.name}</span>
                  <span className="text-xs text-muted">{sub.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-4">
          {featured.map(sub => (
            <Link key={sub.name} to={categoryPath(category.name, sub.name)} onClick={onNavigate} className="group relative block h-52 w-40 overflow-hidden rounded-2xl bg-surface-2">
              {sub.image && <img src={sub.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 text-white">
                <p className="text-sm font-extrabold">{sub.name}</p>
                <p className="text-xs font-semibold">Up to {sub.maxDiscount}% off</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cart } = useContext(CartContext);
  const { wishlist } = useContext(WishlistContext);
  const { openSearch, openVisualSearch } = useContext(UIContext);
  const { categories } = useContext(CatalogContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [ticker, setTicker] = useState(ANNOUNCEMENTS);
  const hoverTimer = useRef(null);

  // Header ticker messages are managed as "offers" in the admin panel
  useEffect(() => {
    api.get('/offers').then(res => {
      const items = res.data.data.filter(o => o.placement === 'ticker').map(o => ({ icon: Megaphone, text: o.title }));
      if (items.length) setTicker(items);
    }).catch(() => {});
  }, []);
  const location = useLocation();

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Close menus whenever the route changes
  useEffect(() => {
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const timer = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 2800);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearInterval(timer); window.removeEventListener('scroll', onScroll); };
  }, []);

  const hoverOpen = (name) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenMenu(name), 120);
  };
  const hoverClose = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenMenu(null), 150);
  };

  const activeCategory = categories.find(c => c.name === openMenu);

  return (
    <>
      {/* Announcement ticker */}
      <div className="overflow-hidden bg-ink text-on-ink">
        <div className="animate-marquee flex w-max gap-12 py-2 text-xs font-semibold hover:[animation-play-state:paused]">
          {[...ticker, ...ticker].map(({ icon: Icon, text }, i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap" aria-hidden={i >= ticker.length}>
              <Icon size={14} /> {text}
            </span>
          ))}
        </div>
      </div>

      <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled ? 'border-line bg-surface/85 backdrop-blur-xl' : 'border-transparent bg-surface'}`} onMouseLeave={hoverClose}>
        <div className="container-x flex h-16 items-center gap-3 md:h-[72px] lg:gap-8">
          <button onClick={() => setDrawerOpen(true)} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 lg:hidden" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <Logo />


          <div className="ml-auto flex flex-1 items-center justify-end gap-1 sm:gap-2">
            {/* Search trigger (looks like a field; opens the search palette) */}
            <div className="relative hidden max-w-xl flex-1 md:block" onMouseEnter={hoverClose}>
              <button onClick={openSearch} className="flex h-11 w-full items-center gap-3 rounded-full border border-line bg-surface-2 pl-4 pr-24 text-left text-sm text-muted transition hover:border-line-strong" aria-label="Search products">
                <Search size={18} className="shrink-0" />
                <span className="truncate">Search for <span key={placeholderIdx} className="animate-fade-in font-semibold text-fg">“{PLACEHOLDERS[placeholderIdx]}”</span></span>
              </button>
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <kbd className="hidden rounded-md border border-line-strong px-1.5 py-0.5 text-[10px] font-bold text-muted xl:block">Ctrl K</kbd>
                <button onClick={openVisualSearch} className="grid h-8 w-8 place-items-center rounded-full bg-surface text-fg shadow-card transition hover:text-accent-text" aria-label="Search with a photo" title="Search with a photo">
                  <Camera size={16} />
                </button>
              </div>
            </div>

            <button onClick={openSearch} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 md:hidden" aria-label="Search">
              <Search size={20} />
            </button>
            <button onClick={openVisualSearch} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 md:hidden" aria-label="Search with a photo">
              <Camera size={20} />
            </button>
            <ThemeToggle className="hidden sm:grid" />

            <div className="group relative hidden sm:block">
              <Link to={user ? '/profile' : '/login'} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label={user ? 'Your account' : 'Login'}>
                <User size={20} />
              </Link>
              <div className="invisible absolute right-0 top-full z-50 w-60 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="card overflow-hidden shadow-float">
                  {user ? (
                    <>
                      <div className="border-b border-line px-4 py-3">
                        <p className="text-sm font-extrabold">Hello, {user.name.split(' ')[0]}</p>
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      </div>
                      {user.role === 'admin' && <Link to="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-accent-text hover:bg-surface-2"><LayoutGrid size={16} /> Admin panel</Link>}
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-surface-2"><User size={16} /> Profile</Link>
                      <Link to="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-surface-2"><Package size={16} /> Orders</Link>
                      <Link to="/wishlist" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-surface-2"><Heart size={16} /> Wishlist</Link>
                      <button onClick={logout} className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-sm font-semibold hover:bg-surface-2"><LogOut size={16} /> Logout</button>
                    </>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm font-extrabold">Welcome</p>
                      <p className="mb-3 text-xs text-muted">Log in to see orders, wishlist and more.</p>
                      <Link to="/login" className="btn-primary w-full py-2.5">Login / Sign up</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Link to="/wishlist" className="relative hidden h-10 w-10 place-items-center rounded-full hover:bg-surface-2 sm:grid" aria-label={`Wishlist, ${wishlist.length} items`}>
              <Heart size={20} />
              <CountBadge count={wishlist.length} />
            </Link>
            <Link to="/cart" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label={`Bag, ${cartCount} items`}>
              <ShoppingBag size={20} />
              <CountBadge count={cartCount} />
            </Link>
          </div>
        </div>

        {/* Category row (desktop) */}
        <nav className="hidden border-t border-line lg:block" aria-label="Categories">
          <div className="container-x hide-scrollbar flex h-11 items-stretch justify-center overflow-x-auto">
            {categories.map(cat => (
              <div key={cat.name} className="flex items-stretch" onMouseEnter={() => hoverOpen(cat.name)}>
                <NavLink
                  to={categoryPath(cat.name)}
                  onFocus={() => setOpenMenu(cat.name)}
                  className={({ isActive }) => `relative flex items-center whitespace-nowrap px-3 text-[13px] font-extrabold uppercase tracking-wider transition xl:px-4 ${isActive || openMenu === cat.name ? 'text-accent-text' : 'text-fg hover:text-accent-text'}`}
                  aria-expanded={openMenu === cat.name}
                >
                  {cat.name}
                  <span className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-accent transition-transform duration-300 xl:inset-x-4 ${openMenu === cat.name ? 'scale-x-100' : 'scale-x-0'}`} />
                </NavLink>
              </div>
            ))}
          </div>
        </nav>

        {activeCategory && (
          <div className="hidden lg:block" onMouseEnter={() => clearTimeout(hoverTimer.current)}>
            <MegaMenu category={activeCategory} onNavigate={() => setOpenMenu(null)} />
          </div>
        )}
      </header>

      {/* Mobile navigation drawer */}
      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Menu" variant="left">
        <div className="flex h-full flex-col">
          <div className="border-b border-line p-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-lg font-extrabold text-on-accent">{user.name[0]?.toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="font-extrabold">Hi, {user.name.split(' ')[0]}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn-primary w-full">Login / Sign up</Link>
            )}
          </div>
          <nav className="flex-1 py-2" aria-label="Categories">
            {categories.map(cat => (
              <div key={cat.name} className="border-b border-line last:border-0">
                <button onClick={() => setExpanded(expanded === cat.name ? null : cat.name)} className="flex w-full items-center justify-between px-5 py-4 text-left font-extrabold" aria-expanded={expanded === cat.name}>
                  {cat.name}
                  <ChevronDown size={18} className={`transition ${expanded === cat.name ? 'rotate-180' : ''}`} />
                </button>
                {expanded === cat.name && (
                  <div className="grid grid-cols-2 gap-2 px-5 pb-4 animate-fade-in">
                    <Link to={categoryPath(cat.name)} className="col-span-2 text-sm font-bold text-accent-text">Shop all {cat.name} →</Link>
                    {cat.subcategories.map(sub => (
                      <Link key={sub.name} to={categoryPath(cat.name, sub.name)} className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-semibold">{sub.name}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="space-y-1 border-t border-line p-4">
            {user && (
              <>
                {user.role === 'admin' && <Link to="/admin" className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-bold text-accent-text hover:bg-surface-2"><LayoutGrid size={18} /> Admin panel</Link>}
                <Link to="/orders" className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-bold hover:bg-surface-2"><Package size={18} /> Orders</Link>
                <Link to="/profile" className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-bold hover:bg-surface-2"><User size={18} /> Profile</Link>
                <button onClick={() => { logout(); setDrawerOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-bold hover:bg-surface-2"><LogOut size={18} /> Logout</button>
              </>
            )}
            <p className="label mt-3 px-2">Appearance</p>
            <ThemeSelector />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Navbar;
