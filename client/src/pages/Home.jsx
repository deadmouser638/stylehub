import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Mic, Zap, ScanSearch, Sparkles, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import ProductRail from '../components/ui/ProductRail';
import Countdown from '../components/ui/Countdown';
import ProductCard from '../components/ui/ProductCard';
import FeatureSpotlight from '../components/ui/FeatureSpotlight';
import SEO from '../components/SEO';
import ExperienceHero from '../components/ExperienceHero';
import { CatalogContext, categoryPath } from '../context/CatalogContext';
import { UIContext } from '../context/UIContext';
import { getRecentlyViewed } from '../utils/storage';

const unsplash = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const HERO = [
  { title: 'Upgrade your tech', text: 'Laptops, phones and more from the brands you trust.', cta: 'Shop laptops', to: '/products/Laptops', img: unsplash('1496181133206-80ce9b88a853', 1400), className: 'md:col-span-2 md:row-span-2', big: true },
  { title: 'Latest smartphones', text: 'iPhone, Galaxy, Pixel & more', cta: 'Shop mobiles', to: '/products/Mobiles', img: unsplash('1511707171634-5f897ff02aa9', 900), className: 'md:col-span-2' },
  { title: '4K Smart TVs', text: 'Big screens, bigger savings', cta: 'Explore', to: '/products/TVs', img: unsplash('1593359677879-a4bb92f829d1', 700), className: '' },
  { title: 'Cameras', text: 'DSLR, mirrorless & action', cta: 'Explore', to: '/products/Cameras', img: unsplash('1502982720700-bfff97f2ecac', 700), className: '' },
];

const TRENDING_TABS = ['All', 'Mobiles', 'Tablets', 'Laptops', 'Accessories', 'TVs', 'Cameras', 'Home Appliances'];

const homeSchema = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  'name': 'ElectroHub',
  'url': 'https://electrohub.vercel.app',
  'description': 'Online Electronics Store for Mobiles, Laptops, 4K TVs, Cameras, Accessories, and Home Appliances.',
  'potentialAction': {
    '@type': 'SearchAction',
    'target': 'https://electrohub.vercel.app/products?search={search_term_string}',
    'query-input': 'required name=search_term_string'
  }
};

const getCached = (key) => {
  try {
    const saved = sessionStorage.getItem(`electrohub_home_${key}`);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};
const setCached = (key, data) => {
  try {
    sessionStorage.setItem(`electrohub_home_${key}`, JSON.stringify(data));
  } catch {}
};

const Home = () => {
  const { categories } = useContext(CatalogContext);
  const { openVisualSearch, openSearch } = useContext(UIContext);
  const [deals, setDeals] = useState(() => getCached('deals'));
  const [newArrivals, setNewArrivals] = useState(() => getCached('newArrivals'));
  const [topRated, setTopRated] = useState(() => getCached('topRated'));
  const [trending, setTrending] = useState(() => getCached('trending'));
  const [trendingTab, setTrendingTab] = useState('All');
  const [recent, setRecent] = useState([]);
  const [hero, setHero] = useState(HERO);
  const [loading, setLoading] = useState({
    deals: getCached('deals').length === 0,
    newArrivals: getCached('newArrivals').length === 0,
    topRated: getCached('topRated').length === 0,
    trending: getCached('trending').length === 0,
  });

  useEffect(() => {
    const load = (key, url, setter) => api.get(url)
      .then(res => {
        setter(res.data.data);
        setCached(key, res.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(l => ({ ...l, [key]: false })));
    load('deals', '/products/deals?limit=12', setDeals);
    load('newArrivals', '/products/new-arrivals?limit=12', setNewArrivals);
    load('topRated', '/products/top-rated?limit=12', setTopRated);

    api.get('/offers').then(res => {
      const banners = res.data.data.filter(o => o.placement === 'hero' && o.image).slice(0, 4);
      if (banners.length) {
        setHero(banners.map((o, i) => ({
          title: o.title, text: o.subtitle || '', cta: o.cta_label || 'Shop now', to: o.link || '/products', img: o.image,
          className: HERO[i]?.className ?? '', big: i === 0,
        })));
      }
    }).catch(() => {});

    const ids = getRecentlyViewed();
    if (ids.length) api.get('/products/batch', { params: { ids: ids.slice(0, 12).join(',') } }).then(res => setRecent(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(l => ({ ...l, trending: true }));
    api.get('/products/trending', { params: { limit: 8, category: trendingTab === 'All' ? undefined : trendingTab } })
      .then(res => {
        if (!cancelled) {
          setTrending(res.data.data);
          if (trendingTab === 'All') setCached('trending', res.data.data);
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(l => ({ ...l, trending: false })); });
    return () => { cancelled = true; };
  }, [trendingTab]);

  const popularSubs = categories
    .flatMap(c => c.subcategories.map(s => ({ ...s, category: c.name })))
    .filter(s => s.image)
    .sort((a, b) => b.maxDiscount - a.maxDiscount)
    .slice(0, 8);

  const brands = ['Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'Canon', 'Nikon', 'OnePlus', 'Daikin', 'Whirlpool', 'Asus', 'Dyson'];

  return (
    <div className="space-y-16 pb-4 md:space-y-24">
      <SEO
        title="ElectroHub - Electronics Online Store | Smartphones, Laptops, 4K TVs & Appliances"
        description="Shop top-rated smartphones, laptops, 4K smart TVs, cameras, accessories, and home appliances on ElectroHub. Enjoy 100% genuine products, free delivery, and instant brand warranty."
        keywords="electrohub, buy laptops online, smartphones, 4k smart TV, cameras, home appliances, electronics shopping"
        schemaJson={homeSchema}
      />

      <ExperienceHero />

      {/* Shop by category */}
      <section id="collections" className="container-x" aria-label="Shop by category">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Explore</p>
            <h2 className="section-title eh-collection-title">Your next obsession.</h2>
          </div>
        </div>
        <div className="hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 xl:mx-0 xl:grid xl:grid-cols-9 xl:overflow-visible xl:px-0">
          {(categories.length ? categories : Array.from({ length: 9 }, (_, i) => ({ name: '', i }))).map((cat, i) => {
            const cover = cat.subcategories?.[0];
            return cat.name ? (
              <Link key={cat.name} to={categoryPath(cat.name)} className="group w-32 shrink-0 snap-start text-center xl:w-auto">
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-surface-2">
                  {cover?.image && <img src={cover.image.replace('w=800', 'w=400')} alt={cat.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute inset-x-2 bottom-3 rounded-full bg-white/95 py-1 text-[11px] font-extrabold text-black">
                    Up to {Math.max(...cat.subcategories.map(s => s.maxDiscount))}% off
                  </span>
                </div>
                <p className="mt-3 text-sm font-extrabold group-hover:text-accent-text">{cat.name}</p>
                <p className="text-xs text-muted">{cat.count} products</p>
              </Link>
            ) : <div key={i} className="skeleton aspect-[3/4] w-32 shrink-0 rounded-3xl xl:w-auto" />;
          })}
        </div>
      </section>

      {/* Deal of the day */}
      <section className="bg-ink py-12 text-on-ink md:py-16">
        <div className="container-x">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.2em]"><Zap size={14} /> Deal of the day</p>
              <h2 className="font-display text-3xl font-semibold md:text-5xl">Biggest discounts, today only</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold opacity-80">Ends in</span>
              <Countdown />
            </div>
          </div>
          <div className="hide-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {(loading.deals ? Array.from({ length: 6 }) : deals).map((p, i) => (
              <div key={p?.id ?? i} className="w-[46%] shrink-0 snap-start rounded-3xl bg-surface p-2.5 text-fg sm:w-[31%] md:w-[23%] xl:w-[18.5%]">
                {p ? <ProductCard product={p} /> : <div className="skeleton aspect-[3/4] rounded-2xl" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending with category tabs */}
      <section className="container-x">
        <ProductRail
          eyebrow="Hot right now"
          title="Trending now"
          products={trending}
          loading={loading.trending}
          viewAllTo={trendingTab === 'All' ? '/products' : categoryPath(trendingTab)}
          toolbar={
            <div className="hide-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Trending categories">
              {TRENDING_TABS.map(tab => (
                <button key={tab} role="tab" aria-selected={trendingTab === tab} onClick={() => setTrendingTab(tab)} className={`chip shrink-0 ${trendingTab === tab ? 'chip-active' : ''}`}>
                  {tab}
                </button>
              ))}
            </div>
          }
        />
      </section>

      {/* 21st UI Feature Spotlight Section */}
      <FeatureSpotlight />

      {/* Visual search promo */}
      <section className="container-x">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface p-8 md:p-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" aria-hidden="true" />
          <div className="relative grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-3">New · Snap to shop</p>
              <h2 className="section-title text-balance">Saw something you love? Just take a photo.</h2>
              <p className="mt-4 max-w-lg text-muted">Point your camera at any phone, laptop, TV or appliance, or upload a picture from your gallery. ElectroHub recognises the product type and shows you similar models in seconds.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={openVisualSearch} className="btn-primary"><Camera size={18} /> Try visual search</button>
                <button onClick={openSearch} className="btn-outline"><Mic size={18} /> Search by voice</button>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-muted"><ShieldCheck size={15} className="text-success" /> Photos are analysed on your device and never uploaded.</p>
            </div>
            <div className="relative mx-auto grid w-full max-w-sm grid-cols-2 gap-3" aria-hidden="true">
              {popularSubs.slice(0, 4).map((s, i) => (
                <div key={s.name} className={`overflow-hidden rounded-2xl bg-surface-2 ${i % 2 ? 'mt-8' : ''}`}>
                  <img src={s.image.replace('w=800', 'w=400')} alt={s.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                </div>
              ))}
              <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-on-accent shadow-float ring-8 ring-surface">
                <ScanSearch size={34} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular subcategories */}
      {popularSubs.length > 0 && (
        <section className="container-x">
          <p className="eyebrow mb-2">Most loved</p>
          <h2 className="section-title mb-6">Shop by type</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {popularSubs.map((s, i) => (
              <Link key={s.category + s.name} to={categoryPath(s.category, s.name)} className={`group relative overflow-hidden rounded-3xl bg-surface-2 ${i === 0 || i === 5 ? 'md:row-span-2' : ''}`}>
                <img src={s.image.replace('w=800', 'w=600')} alt={s.name} loading="lazy" className={`w-full object-cover transition duration-700 group-hover:scale-105 ${i === 0 || i === 5 ? 'aspect-[3/4] h-full' : 'aspect-[4/3]'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/85">{s.category}</p>
                  <p className="text-lg font-extrabold">{s.name}</p>
                  <p className="text-sm font-semibold">Up to {s.maxDiscount}% off</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Brands strip */}
      <section className="overflow-hidden border-y border-line bg-surface py-8" aria-label="Top brands">
        <div className="animate-marquee flex w-max gap-4 hover:[animation-play-state:paused]">
          {[...brands, ...brands].map((b, i) => (
            <Link key={i} to={`/products?brand=${encodeURIComponent(b)}`} tabIndex={i >= brands.length ? -1 : undefined} aria-hidden={i >= brands.length} className="rounded-full border border-line px-8 py-3 font-display text-2xl font-semibold text-fg transition hover:border-fg hover:bg-surface-2">
              {b}
            </Link>
          ))}
        </div>
      </section>

      <section className="container-x">
        <ProductRail eyebrow="Just in" title="New arrivals" products={newArrivals} loading={loading.newArrivals} viewAllTo="/products?sort=newest" />
      </section>

      <section className="container-x">
        <ProductRail eyebrow="Customer favourites" title="Top rated" products={topRated} loading={loading.topRated} viewAllTo="/products?sort=rating" />
      </section>

      {recent.length > 0 && (
        <section className="container-x">
          <ProductRail eyebrow="Pick up where you left off" title="Recently viewed" products={recent} />
        </section>
      )}
    </div>
  );
};

export default Home;
