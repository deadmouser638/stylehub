import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash, Heart, Tag, Minus, Plus, Truck, ShieldCheck, ShoppingBag, ArrowRight, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { CartContext } from '../context/CartContext';
import { WishlistContext } from '../context/WishlistContext';
import api from '../utils/api';
import { getCartSummary, discountedPrice } from '../utils/pricing';
import { formatPrice } from '../utils/format';
import PriceSummary from '../components/PriceSummary';
import ProductRail from '../components/ui/ProductRail';
import { Spinner } from '../components/ui/Skeletons';

const FREE_DELIVERY_AT = 999;

const Cart = () => {
  const { cart, cartLoading, removeFromCart, updateQuantity, appliedCoupon, setAppliedCoupon } = useContext(CartContext);
  const { wishlist, addToWishlist } = useContext(WishlistContext);
  const [couponCode, setCouponCode] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [busyItem, setBusyItem] = useState(null);
  const navigate = useNavigate();

  const summary = getCartSummary(cart, appliedCoupon);
  const appliedCode = appliedCoupon?.code;

  useEffect(() => {
    api.get('/coupons').then(res => setCoupons(res.data.data)).catch(() => {});
    api.get('/products/trending', { params: { limit: 12 } }).then(res => setSuggestions(res.data.data)).catch(() => {});
  }, []);

  // Re-check the applied coupon whenever the bag total changes (e.g. it may drop below the minimum order)
  useEffect(() => {
    if (!appliedCode || cart.length === 0) return;
    api.post('/coupons/apply', { code: appliedCode, orderAmount: summary.subtotal })
      .catch(err => {
        setAppliedCoupon(null);
        toast.error(err.response?.data?.message || 'Coupon removed');
      });
  }, [appliedCode, summary.subtotal, cart.length, setAppliedCoupon]);

  const applyCoupon = async (code) => {
    const clean = code.trim();
    if (!clean) return;
    try {
      const res = await api.post('/coupons/apply', { code: clean, orderAmount: summary.subtotal });
      setAppliedCoupon(res.data.data);
      setCouponCode('');
      toast.success(`${res.data.data.code} applied!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon');
    }
  };

  const withBusy = async (itemId, fn) => {
    setBusyItem(itemId);
    await fn();
    setBusyItem(null);
  };

  const handleMoveToWishlist = (item) => withBusy(item.id, async () => {
    const alreadyWishlisted = wishlist.some(w => w.product_id === item.product_id);
    if (alreadyWishlisted || await addToWishlist(item.product_id)) {
      await removeFromCart(item.id);
      toast.success('Moved to wishlist');
    }
  });

  if (cartLoading) return <Spinner />;

  if (cart.length === 0) {
    return (
      <div className="container-x py-12">
        <div className="card mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-accent-text"><ShoppingBag size={36} /></span>
          <h1 className="mt-6 font-display text-3xl font-semibold">Your bag is empty</h1>
          <p className="mt-2 text-muted">Looks like you haven't added anything yet. Let's change that.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/products" className="btn-primary">Start shopping <ArrowRight size={16} /></Link>
            {wishlist.length > 0 && <Link to="/wishlist" className="btn-outline"><Heart size={16} /> From wishlist ({wishlist.length})</Link>}
          </div>
        </div>
        <ProductRail className="mt-16" eyebrow="Popular picks" title="Trending right now" products={suggestions} />
      </div>
    );
  }

  const afterCoupon = summary.subtotal - summary.couponDiscount;
  const progress = Math.min(100, (afterCoupon / FREE_DELIVERY_AT) * 100);
  const totalSaved = summary.mrpDiscount + summary.couponDiscount;
  const itemCount = cart.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="container-x py-8 md:py-12">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">Your bag <span className="font-sans text-lg font-semibold text-muted">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span></h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Free delivery progress */}
          <div className="card p-5">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Truck size={18} className={progress >= 100 ? 'text-success' : ''} />
              {progress >= 100
                ? <span className="text-success">Yay! You've unlocked free delivery</span>
                : <span>Add <strong>{formatPrice(FREE_DELIVERY_AT + 1 - afterCoupon)}</strong> more for free delivery</span>}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
              <div className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-success' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <ul className="space-y-4">
            {cart.map(item => {
              const unitPrice = Math.round(discountedPrice(item));
              const maxQty = Math.max(1, Math.min(10, item.stock));
              const busy = busyItem === item.id;
              return (
                <li key={item.id} className={`card flex gap-4 p-4 transition ${busy ? 'opacity-60' : ''}`}>
                  <Link to={`/product/${item.product_id}`} className="w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2 sm:w-28">
                    <img src={item.images[0]?.replace('w=800', 'w=300')} alt={item.name} className="aspect-[3/4] h-full w-full object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-extrabold">{item.brand}</p>
                        <Link to={`/product/${item.product_id}`} className="line-clamp-2 text-sm text-muted hover:text-fg">{item.name.replace(`${item.brand} `, '')}</Link>
                      </div>
                      <button onClick={() => withBusy(item.id, () => removeFromCart(item.id))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-danger" aria-label={`Remove ${item.name}`}>
                        <Trash size={17} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.size && <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold">Size: {item.size}</span>}
                      <div className="flex items-center rounded-full border border-line-strong" role="group" aria-label="Quantity">
                        <button onClick={() => withBusy(item.id, () => (item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2" aria-label={item.quantity > 1 ? 'Decrease quantity' : 'Remove item'}>
                          {item.quantity > 1 ? <Minus size={14} /> : <Trash size={13} />}
                        </button>
                        <span className="w-7 text-center text-sm font-extrabold" aria-live="polite">{item.quantity}</span>
                        <button onClick={() => withBusy(item.id, () => updateQuantity(item.id, item.quantity + 1))} disabled={item.quantity >= maxQty} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40" aria-label="Increase quantity">
                          <Plus size={14} />
                        </button>
                      </div>
                      {item.stock <= 5 && <span className="text-xs font-bold text-danger">Only {item.stock} left</span>}
                    </div>

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-extrabold">{formatPrice(unitPrice * item.quantity)}</span>
                        {item.discount_percent > 0 && (
                          <>
                            <span className="text-xs text-muted line-through">{formatPrice(item.price * item.quantity)}</span>
                            <span className="text-xs font-bold text-sale">{Math.round(item.discount_percent)}% OFF</span>
                          </>
                        )}
                      </div>
                      <button onClick={() => handleMoveToWishlist(item)} className="flex items-center gap-1.5 text-xs font-bold text-fg hover:text-accent-text">
                        <Heart size={14} /> Move to wishlist
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Summary */}
        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <div className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider"><Tag size={16} /> Coupons</h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-2xl border border-success/40 bg-success-soft p-3">
                <div>
                  <p className="flex items-center gap-1.5 font-extrabold text-success"><Check size={16} /> {appliedCoupon.code}</p>
                  <p className="text-xs font-semibold text-success">You save {formatPrice(summary.couponDiscount)}</p>
                </div>
                <button onClick={() => setAppliedCoupon(null)} className="text-xs font-extrabold text-fg hover:underline">Remove</button>
              </div>
            ) : (
              <>
                <form onSubmit={(e) => { e.preventDefault(); applyCoupon(couponCode); }} className="flex gap-2">
                  <label htmlFor="coupon" className="sr-only">Coupon code</label>
                  <input id="coupon" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" className="input py-2.5 uppercase" />
                  <button type="submit" className="btn-dark px-5 py-2.5">Apply</button>
                </form>
                {coupons.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {coupons.map(c => {
                      const eligible = summary.subtotal >= c.min_order;
                      return (
                        <li key={c.code} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold">{c.code}</p>
                            <p className="text-xs text-muted">{eligible ? c.description : `Add ${formatPrice(c.min_order - summary.subtotal)} more to unlock`}</p>
                          </div>
                          <button onClick={() => applyCoupon(c.code)} disabled={!eligible} className="shrink-0 text-xs font-extrabold text-accent-text disabled:text-muted">Apply</button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="card p-5">
            <PriceSummary summary={summary} itemCount={cart.length} couponCode={appliedCoupon?.code} />
            {totalSaved > 0 && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm font-bold text-success">
                <Sparkles size={16} /> You're saving {formatPrice(totalSaved)} on this order
              </p>
            )}
            <button onClick={() => navigate('/checkout')} className="btn-primary mt-5 w-full py-4 text-base">
              Place order <ArrowRight size={18} />
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck size={14} /> Safe & secure checkout</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
