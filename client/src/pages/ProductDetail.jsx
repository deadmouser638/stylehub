import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, Heart, Truck, RotateCcw, ShieldCheck, Share2, Tag, Copy, Check, Ruler, ChevronRight, MapPin, Banknote, ArrowRight, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { CartContext } from '../context/CartContext';
import { WishlistContext } from '../context/WishlistContext';
import { AuthContext } from '../context/AuthContext';
import { categoryPath } from '../context/CatalogContext';
import ProductRail from '../components/ui/ProductRail';
import Price from '../components/ui/Price';
import { RatingPill, StarRow } from '../components/ui/RatingStars';
import Modal from '../components/ui/Modal';
import { Spinner } from '../components/ui/Skeletons';
import { addRecentlyViewed, getRecentlyViewed } from '../utils/storage';
import { addDays, COLOR_SWATCHES, formatDate, formatPrice, sellingPrice } from '../utils/format';
import SEO from '../components/SEO';

const APPAREL_GUIDE = [
  ['XS', '34', '28', '36'], ['S', '36', '30', '38'], ['M', '38', '32', '40'],
  ['L', '40', '34', '42'], ['XL', '42', '36', '44'], ['XXL', '44', '38', '46'],
];

const Gallery = ({ images, name }) => {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(null);
  const scrollerRef = useRef(null);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      {/* Phones: swipe between photos */}
      <div className="relative md:hidden">
        <div ref={scrollerRef} onScroll={onScroll} className="hide-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto">
          {images.map((img, i) => (
            <img key={img + i} src={img} alt={i === 0 ? name : ''} className="aspect-[4/5] w-full shrink-0 snap-center object-cover" />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
          {images.map((_, i) => <span key={i} className={`h-1.5 rounded-full bg-white transition-all ${active === i ? 'w-5' : 'w-1.5 opacity-60'}`} />)}
        </div>
      </div>

      {/* Larger screens: thumbnails + zoomable main image */}
      <div className="hidden gap-4 md:flex">
        <div className="flex w-20 shrink-0 flex-col gap-3">
          {images.map((img, i) => (
            <button key={img + i} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)} className={`overflow-hidden rounded-xl border-2 transition ${active === i ? 'border-fg' : 'border-transparent opacity-70 hover:opacity-100'}`} aria-label={`Show photo ${i + 1}`}>
              <img src={img.replace('w=800', 'w=200')} alt="" className="aspect-[3/4] w-full object-cover" />
            </button>
          ))}
        </div>
        <div
          className="relative flex-1 cursor-zoom-in overflow-hidden rounded-3xl bg-surface-2"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          <img
            src={images[active]?.replace('w=800', 'w=1400')}
            alt={name}
            className="aspect-[4/5] w-full object-cover transition-transform duration-200"
            style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
          {!zoom && <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-bold text-fg backdrop-blur">Hover to zoom</span>}
        </div>
      </div>
    </div>
  );
};

const Reviews = ({ productId, reviews, summary, onAdded }) => {
  const { user } = useContext(AuthContext);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();

  const total = summary?.total_reviews || 0;
  const alreadyReviewed = user && reviews.some(r => r.user_id === user.id);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Please choose a star rating');
    setSubmitting(true);
    try {
      await api.post(`/products/${productId}/reviews`, { rating, comment });
      toast.success('Thanks for your review!');
      setRating(0);
      setComment('');
      onAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="scroll-mt-28 border-t border-line pt-12">
      <h2 className="section-title mb-8">Ratings & reviews</h2>
      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          {total > 0 ? (
            <div className="card p-6">
              <div className="flex items-end gap-3">
                <span className="font-display text-5xl font-semibold">{Number(summary.avg_rating).toFixed(1)}</span>
                <div className="pb-1.5">
                  <StarRow value={summary.avg_rating} />
                  <p className="mt-1 text-xs text-muted">{total} written reviews</p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                {[5, 4, 3, 2, 1].map(n => {
                  const count = summary[`star_${n}`] || 0;
                  return (
                    <div key={n} className="flex items-center gap-3 text-sm">
                      <span className="w-6 font-bold">{n}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div className={`h-full rounded-full ${n >= 4 ? 'bg-success' : n === 3 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-muted">No written reviews yet. Be the first to share your thoughts.</p>
          )}

          <div className="card mt-6 p-6">
            <h3 className="font-extrabold">Write a review</h3>
            {!user ? (
              <p className="mt-2 text-sm text-muted"><Link to="/login" state={{ from: location.pathname }} className="link">Log in</Link> to review this product.</p>
            ) : alreadyReviewed ? (
              <p className="mt-2 text-sm text-muted">You've already reviewed this product. Thank you!</p>
            ) : (
              <form onSubmit={submit} className="mt-3 space-y-3">
                <StarRow value={rating} size={26} onChange={setRating} />
                <label htmlFor="review-comment" className="sr-only">Your review</label>
                <textarea id="review-comment" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="What did you like or dislike?" className="input resize-none" maxLength={500} />
                <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? 'Posting…' : 'Post review'}</button>
              </form>
            )}
          </div>
        </div>

        <ul className="space-y-4">
          {reviews.map(r => (
            <li key={r.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 font-extrabold">{r.user_name[0]}</span>
                  <div>
                    <p className="text-sm font-extrabold">{r.user_name}</p>
                    <p className="flex items-center gap-1 text-xs text-success"><BadgeCheck size={13} /> Verified buyer</p>
                  </div>
                </div>
                <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
              </div>
              <div className="mt-3"><StarRow value={r.rating} size={15} /></div>
              {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [related, setRelated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState('');
  const [delivery, setDelivery] = useState(null);
  const [copied, setCopied] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const { user } = useContext(AuthContext);
  const { cart, addToCart } = useContext(CartContext);
  const { wishlist, addToWishlist, removeFromWishlist } = useContext(WishlistContext);
  const navigate = useNavigate();
  const location = useLocation();

  const loadProduct = () => api.get(`/products/${id}`).then(res => setData(res.data.data));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedSize('');
    setSizeError(false);
    setDelivery(null);

    const previous = getRecentlyViewed().filter(v => v !== Number(id));
    addRecentlyViewed(Number(id));

    Promise.all([
      api.get(`/products/${id}`),
      api.get(`/products/${id}/related`),
      previous.length ? api.get('/products/batch', { params: { ids: previous.slice(0, 12).join(',') } }) : Promise.resolve({ data: { data: [] } }),
    ])
      .then(([prodRes, relatedRes, recentRes]) => {
        if (cancelled) return;
        setData(prodRes.data.data);
        setRelated(relatedRes.data.data);
        setRecent(recentRes.data.data);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    api.get('/coupons').then(res => setCoupons(res.data.data)).catch(() => {});
  }, []);

  if (loading) return <Spinner className="min-h-[70vh]" />;
  if (!data) return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-3xl font-semibold">Product not found</p>
      <Link to="/products" className="btn-primary">Browse all products</Link>
    </div>
  );

  const { product, reviews, ratingSummary } = data;
  const needsSize = product.sizes.length > 1;
  const isWishlisted = wishlist.some(item => item.product_id === product.id);
  const inBag = cart.some(item => item.product_id === product.id && (!needsSize || item.size === selectedSize));
  const outOfStock = product.stock === 0;
  const hasSizeGuide = product.sizes.some(s => APPAREL_GUIDE.some(([size]) => size === s));

  const requireLogin = () => navigate('/login', { state: { from: location.pathname } });

  const handleAddToCart = async () => {
    if (inBag) return navigate('/cart');
    if (needsSize && !selectedSize) {
      setSizeError(true);
      document.getElementById('size-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return toast.error('Please select a size');
    }
    setAdding(true);
    await addToCart(product.id, selectedSize || product.sizes[0] || null, 1);
    setAdding(false);
  };

  const handleWishlist = () => {
    if (isWishlisted) removeFromWishlist(product.id);
    else addToWishlist(product.id);
  };

  const checkPincode = (e) => {
    e.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pincode)) return setDelivery({ error: 'Please enter a valid 6-digit pincode' });
    // Metro pincodes (starting 1-6) get faster delivery in this demo
    const days = Number(pincode[0]) <= 6 ? 3 : 5;
    setDelivery({ date: addDays(new Date(), days), cod: sellingPrice(product) < 20000 });
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch { /* clipboard may be blocked; still show feedback */ }
    setCopied(code);
    toast.success(`Copied ${code}`);
    setTimeout(() => setCopied(''), 2000);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast.success('Link copied'); } catch { toast.error('Could not copy link'); }
    }
  };

  const title = product.name.replace(`${product.brand} `, '');

  const productSchema = product ? {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    'name': product.name,
    'image': product.images || [product.image],
    'description': product.description || product.name,
    'sku': `EH-${product.id}`,
    'brand': {
      '@type': 'Brand',
      'name': product.brand || 'ElectroHub'
    },
    'offers': {
      '@type': 'Offer',
      'url': window.location.href,
      'priceCurrency': 'INR',
      'price': product.price,
      'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'itemCondition': 'https://schema.org/NewCondition'
    },
    ...(ratingSummary?.total_reviews > 0 ? {
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': ratingSummary.avg_rating,
        'reviewCount': ratingSummary.total_reviews
      }
    } : {})
  } : null;

  return (
    <div className="container-x pb-28 pt-4 md:pb-10 md:pt-8">
      {product && (
        <SEO
          title={`${product.name} - Buy Online at ElectroHub`}
          description={product.description || `Buy ${product.name} with official brand warranty, best price, and fast delivery on ElectroHub.`}
          keywords={`${product.name}, ${product.brand}, ${product.category}, buy ${product.name} online`}
          image={product.images?.[0] || product.image}
          type="product"
          schemaJson={productSchema}
        />
      )}
      <nav className="mb-5 hidden flex-wrap items-center gap-1.5 text-sm text-muted md:flex" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-fg">Home</Link><ChevronRight size={14} />
        <Link to={categoryPath(product.category)} className="hover:text-fg">{product.category}</Link><ChevronRight size={14} />
        <Link to={categoryPath(product.category, product.subcategory)} className="hover:text-fg">{product.subcategory}</Link><ChevronRight size={14} />
        <span className="truncate font-semibold text-fg">{product.brand}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-[1.15fr_1fr] lg:gap-14">
        <Gallery images={product.images} name={product.name} />

        <div className="md:sticky md:top-24 md:self-start lg:top-36">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link to={`/products?brand=${encodeURIComponent(product.brand)}`} className="eyebrow hover:underline">{product.brand}</Link>
              <h1 className="mt-2 font-display text-2xl font-semibold leading-tight md:text-3xl">{title}</h1>
            </div>
            <button onClick={share} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong transition hover:border-fg" aria-label="Share"><Share2 size={18} /></button>
          </div>

          <a href="#reviews" className="mt-3 inline-block"><RatingPill rating={product.rating} count={product.rating_count} className="border border-line" /></a>

          <div className="mt-5 border-t border-line pt-5">
            <Price product={product} size="lg" />
            <p className="mt-1 text-sm font-semibold text-success">Inclusive of all taxes</p>
            {product.stock > 0 && product.stock <= 5 && <p className="mt-2 text-sm font-bold text-danger">Hurry, only {product.stock} left in stock!</p>}
          </div>

          {product.colors.length > 0 && (
            <p className="mt-5 flex items-center gap-2 text-sm">
              <span className="font-bold">Colour:</span>
              <span className="h-5 w-5 rounded-full border border-line-strong" style={{ background: COLOR_SWATCHES[product.colors[0]] }} aria-hidden="true" />
              {product.colors.join(', ')}
            </p>
          )}

          {needsSize && (
            <div id="size-picker" className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className={`text-sm font-extrabold uppercase tracking-wider ${sizeError ? 'text-danger' : ''}`}>{sizeError ? 'Please select a size' : 'Select size'}</p>
                {hasSizeGuide && <button onClick={() => setGuideOpen(true)} className="link flex items-center gap-1 text-sm"><Ruler size={15} /> Size guide</button>}
              </div>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Size">
                {product.sizes.map(size => (
                  <button key={size} role="radio" aria-checked={selectedSize === size} onClick={() => { setSelectedSize(size); setSizeError(false); }} className={`min-w-12 rounded-full border-2 px-4 py-2.5 text-sm font-bold transition ${selectedSize === size ? 'border-fg bg-ink text-on-ink' : sizeError ? 'border-danger' : 'border-line-strong hover:border-fg'}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 hidden gap-3 md:flex">
            <button onClick={handleAddToCart} disabled={outOfStock || adding} className="btn-primary flex-1 py-4 text-base">
              <ShoppingBag size={20} /> {outOfStock ? 'Out of stock' : inBag ? 'Go to bag' : adding ? 'Adding…' : 'Add to bag'}
            </button>
            <button onClick={handleWishlist} className="btn-outline px-6 py-4 text-base" aria-pressed={isWishlisted}>
              <Heart size={20} className={isWishlisted ? 'fill-accent text-accent' : ''} /> {isWishlisted ? 'Wishlisted' : 'Wishlist'}
            </button>
          </div>

          {/* Delivery */}
          <div className="card mt-7 p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider"><Truck size={18} /> Delivery options</p>
            <form onSubmit={checkPincode} className="mt-3 flex gap-2">
              <label htmlFor="pincode" className="sr-only">Pincode</label>
              <div className="relative flex-1">
                <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input id="pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="Enter pincode" className="input py-2.5 pl-10" />
              </div>
              <button type="submit" className="btn-dark px-5 py-2.5">Check</button>
            </form>
            {delivery?.error && <p className="mt-2 text-sm font-semibold text-danger" role="alert">{delivery.error}</p>}
            {delivery?.date && (
              <ul className="mt-3 space-y-1.5 text-sm" aria-live="polite">
                <li className="flex items-center gap-2"><Truck size={15} className="text-success" /> Get it by <strong>{delivery.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong></li>
                <li className="flex items-center gap-2"><Banknote size={15} className="text-success" /> {delivery.cod ? 'Pay on delivery available' : 'Pay on delivery not available for this item'}</li>
              </ul>
            )}
            <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-xs font-semibold text-muted">
              <li className="flex flex-col items-center gap-1"><ShieldCheck size={20} className="text-fg" /> Brand warranty</li>
              <li className="flex flex-col items-center gap-1"><RotateCcw size={20} className="text-fg" /> 7-day replacement</li>
              <li className="flex flex-col items-center gap-1"><Truck size={20} className="text-fg" /> Free over ₹999</li>
            </ul>
          </div>

          {/* Offers */}
          {coupons.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider"><Tag size={16} /> Best offers</p>
              <ul className="space-y-2">
                {coupons.slice(0, 3).map(c => (
                  <li key={c.code} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold">{c.code}</p>
                      <p className="text-xs text-muted">{c.description}</p>
                    </div>
                    <button onClick={() => copyCode(c.code)} className="flex shrink-0 items-center gap-1 text-xs font-bold text-accent-text" aria-label={`Copy code ${c.code}`}>
                      {copied === c.code ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications */}
          {Object.keys(product.specs || {}).length > 0 && (
            <div className="mt-7 border-t border-line pt-6">
              <p className="text-sm font-extrabold uppercase tracking-wider">Specifications</p>
              <table className="mt-3 w-full overflow-hidden rounded-2xl text-sm">
                <tbody>
                  {Object.entries(product.specs).map(([k, v], i) => (
                    <tr key={k} className={i % 2 ? '' : 'bg-surface-2'}>
                      <th scope="row" className="w-2/5 px-3 py-2.5 text-left font-semibold text-muted">{k}</th>
                      <td className="px-3 py-2.5 font-bold">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Details */}
          <div className="mt-7 border-t border-line pt-6">
            <p className="text-sm font-extrabold uppercase tracking-wider">Product details</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{product.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[['Brand', product.brand], ['Category', `${product.category} · ${product.subcategory}`], ['Colour', product.colors.join(', ') || '—'], ['SKU', `EH-${String(product.id).padStart(5, '0')}`]].map(([k, v]) => (
                <div key={k} className="border-b border-line pb-2">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-16 space-y-16">
        <Reviews productId={product.id} reviews={reviews} summary={ratingSummary} onAdded={loadProduct} />
        <ProductRail eyebrow="You may also like" title="Similar products" products={related} viewAllTo={categoryPath(product.category, product.subcategory)} />
        {recent.length > 0 && <ProductRail eyebrow="Your history" title="Recently viewed" products={recent} />}
      </div>

      {/* Mobile sticky purchase bar (sits above the bottom tab bar) */}
      <div className="fixed inset-x-0 bottom-[60px] z-30 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <button onClick={handleWishlist} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-strong" aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={isWishlisted}>
          <Heart size={20} className={isWishlisted ? 'fill-accent text-accent' : ''} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-none">{formatPrice(sellingPrice(product))}</p>
          {product.discount_percent > 0 && <p className="text-xs text-muted"><span className="line-through">{formatPrice(product.price)}</span> <span className="font-bold text-sale">{Math.round(product.discount_percent)}% off</span></p>}
        </div>
        <button onClick={handleAddToCart} disabled={outOfStock || adding} className="btn-primary px-6">
          {outOfStock ? 'Sold out' : inBag ? <>Go to bag <ArrowRight size={16} /></> : 'Add to bag'}
        </button>
      </div>

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Size guide">
        <div className="p-5">
          <p className="mb-4 text-sm text-muted">Body measurements in inches. If you're between sizes, pick the larger one for a relaxed fit.</p>
          <table className="w-full text-center text-sm">
            <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-muted"><th className="py-2">Size</th><th>Chest</th><th>Waist</th><th>Hip</th></tr></thead>
            <tbody>
              {APPAREL_GUIDE.map(row => (
                <tr key={row[0]} className="border-b border-line last:border-0">
                  {row.map((cell, i) => <td key={i} className={`py-2.5 ${i === 0 ? 'font-extrabold' : ''}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
};

export default ProductDetail;
