import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X, Camera, ArrowUpDown, Star, SearchX } from 'lucide-react';
import api from '../utils/api';
import ProductCard from '../components/ui/ProductCard';
import { ProductGridSkeleton } from '../components/ui/Skeletons';
import FilterPanel, { PRICE_PRESETS } from '../components/FilterPanel';
import Modal from '../components/ui/Modal';
import { CatalogContext, categoryPath } from '../context/CatalogContext';
import { UIContext } from '../context/UIContext';
import { getVisualSearchImage } from '../utils/storage';
import { COLOR_SWATCHES, formatPrice } from '../utils/format';

const SORTS = [
  { value: 'popularity', label: 'Recommended' },
  { value: 'newest', label: "What's new" },
  { value: 'rating', label: 'Customer rating' },
  { value: 'discount', label: 'Better discount' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const FILTER_KEYS = ['search', 'subcategory', 'brand', 'color', 'size', 'minPrice', 'maxPrice', 'discount', 'minRating', 'sort', 'page', 'boostColor'];
const EMPTY_FACETS = { subcategories: [], brands: [], colors: [], sizes: [], specs: {}, price: { min: 0, max: 0 } };

const pageList = (current, total) => {
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
};

const VisualSearchBanner = ({ values, set }) => {
  const { openVisualSearch } = useContext(UIContext);
  const image = getVisualSearchImage();
  let result = { matches: [], colors: [] };
  try {
    result = JSON.parse(sessionStorage.getItem('visualSearchResult')) || result;
  } catch { /* ignore */ }

  return (
    <div className="card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      {image && <img src={image} alt="Your search photo" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-1">Visual search</p>
        <p className="font-extrabold">Products similar to your photo</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.matches.map(m => (
            <button key={m.subcategory} onClick={() => set({ subcategory: values.subcategory === m.subcategory ? '' : m.subcategory })} className={`chip text-xs ${values.subcategory === m.subcategory ? 'chip-active' : ''}`} aria-pressed={values.subcategory === m.subcategory}>
              {m.subcategory}
            </button>
          ))}
          {result.colors.map(({ name }) => (
            <button key={name} onClick={() => set({ boostColor: values.boostColor === name ? '' : name })} className={`chip text-xs ${values.boostColor === name ? 'chip-active' : ''}`} aria-pressed={values.boostColor === name}>
              <span className="h-3.5 w-3.5 rounded-full border border-line-strong" style={{ background: COLOR_SWATCHES[name] }} aria-hidden="true" /> {name} first
            </button>
          ))}
        </div>
      </div>
      <button onClick={openVisualSearch} className="btn-outline shrink-0 py-2.5"><Camera size={16} /> New photo</button>
    </div>
  );
};

const ProductListing = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useContext(CatalogContext);
  const [products, setProducts] = useState([]);
  const [facets, setFacets] = useState(EMPTY_FACETS);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const queryString = searchParams.toString();
  // Known filters plus any specification filters (spec_RAM, spec_Storage, ...)
  const values = useMemo(() => ({ ...Object.fromEntries(FILTER_KEYS.map(k => [k, ''])), ...Object.fromEntries(searchParams.entries()) }), [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams(queryString);
    params.delete('visual');
    if (category) params.set('category', category);
    api.get(`/products?${params.toString()}`)
      .then(res => {
        if (cancelled) return;
        setProducts(res.data.data.products);
        setPagination(res.data.data.pagination);
        setFacets(res.data.data.facets);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) { setLoading(false); setFirstLoad(false); }
      });
    return () => { cancelled = true; };
  }, [category, queryString]);

  const set = (changes) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)));
    if (!('page' in changes)) params.delete('page');
    setSearchParams(params);
  };

  const toggle = (key, value) => {
    const current = values[key] ? values[key].split(',') : [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    set({ [key]: next.join(',') });
  };

  const goToPage = (page) => {
    set({ page: page > 1 ? String(page) : '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => {
    const params = new URLSearchParams();
    if (values.search) params.set('search', values.search);
    if (searchParams.get('visual')) params.set('visual', '1');
    setSearchParams(params);
  };

  // Chips for every active filter so each can be removed with one tap
  const activeChips = [
    ...['subcategory', 'brand', 'color', 'size', ...Object.keys(values).filter(k => k.startsWith('spec_'))].flatMap(key =>
      (values[key] ? values[key].split(',') : []).map(v => ({ key: `${key}:${v}`, label: v, remove: () => toggle(key, v) }))
    ),
    ...(values.minPrice || values.maxPrice ? [{
      key: 'price',
      label: PRICE_PRESETS.find(p => p.min === values.minPrice && p.max === values.maxPrice)?.label
        || `${values.minPrice ? formatPrice(values.minPrice) : '₹0'} – ${values.maxPrice ? formatPrice(values.maxPrice) : 'any'}`,
      remove: () => set({ minPrice: '', maxPrice: '' }),
    }] : []),
    ...(values.discount ? [{ key: 'discount', label: `${values.discount}%+ off`, remove: () => set({ discount: '' }) }] : []),
    ...(values.minRating ? [{ key: 'rating', label: `${values.minRating}★ & above`, remove: () => set({ minRating: '' }) }] : []),
  ];

  const isVisual = searchParams.get('visual') === '1';
  const title = values.search
    ? `Results for “${values.search}”`
    : isVisual ? 'Visual search results'
      : values.subcategory && !values.subcategory.includes(',') ? values.subcategory
        : values.brand && !values.brand.includes(',') ? values.brand
          : category || 'All products';
  const sortLabel = SORTS.find(s => s.value === (values.sort || 'popularity'))?.label;
  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.total, pagination.page * pagination.limit);

  const filterPanel = (
    <FilterPanel facets={facets} values={values} toggle={toggle} set={set} category={category} categories={categories} />
  );

  return (
    <div className="container-x py-6 md:py-10">
      {/* Breadcrumb & heading */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-fg">Home</Link>
        <ChevronRight size={14} />
        {category ? <Link to={categoryPath(category)} className="hover:text-fg">{category}</Link> : <span>Shop</span>}
        {values.subcategory && !values.subcategory.includes(',') && category && (<><ChevronRight size={14} /><span className="font-semibold text-fg">{values.subcategory}</span></>)}
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{title}</h1>
        <p className="text-sm text-muted" aria-live="polite">{loading && firstLoad ? 'Loading…' : `${pagination.total.toLocaleString('en-IN')} products`}</p>
      </div>

      {isVisual && <VisualSearchBanner values={values} set={set} />}

      {/* Subcategory quick filters */}
      {facets.subcategories.length > 1 && (
        <div className="hide-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
          {facets.subcategories.map(s => {
            const active = (values.subcategory || '').split(',').includes(s.value);
            return (
              <button key={s.value} onClick={() => toggle('subcategory', s.value)} className={`chip shrink-0 ${active ? 'chip-active' : ''}`} aria-pressed={active}>
                {s.value} <span className={active ? 'opacity-80' : 'text-muted'}>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile controls */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 flex gap-2 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur lg:hidden">
        <button onClick={() => setFiltersOpen(true)} className="btn-outline flex-1 py-2.5">
          <SlidersHorizontal size={16} /> Filters {activeChips.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-on-accent">{activeChips.length}</span>}
        </button>
        <button onClick={() => setSortOpen(true)} className="btn-outline flex-1 py-2.5"><ArrowUpDown size={16} /> {sortLabel}</button>
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-72 shrink-0 lg:block" aria-label="Filters">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
            <div className="flex items-center justify-between pb-2">
              <h2 className="font-display text-xl font-semibold">Filters</h2>
              {activeChips.length > 0 && <button onClick={clearAll} className="link text-sm">Clear all</button>}
            </div>
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {activeChips.map(chip => (
              <button key={chip.key} onClick={chip.remove} className="chip gap-1 bg-surface-2 text-xs" aria-label={`Remove filter ${chip.label}`}>
                {chip.label} <X size={14} />
              </button>
            ))}
            {activeChips.length > 0 && <button onClick={clearAll} className="link text-xs lg:hidden">Clear all</button>}
            <div className="relative ml-auto hidden lg:block">
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select id="sort" value={values.sort || 'popularity'} onChange={e => set({ sort: e.target.value })} className="cursor-pointer appearance-none rounded-full border border-line-strong bg-surface py-2.5 pl-4 pr-10 text-sm font-bold">
                {SORTS.map(s => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>

          {firstLoad && loading ? (
            <ProductGridSkeleton count={9} className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3" />
          ) : products.length > 0 ? (
            <>
              <div className={`grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity md:grid-cols-3 2xl:grid-cols-4 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>

              {pagination.pages > 1 && (
                <nav className="mt-12 flex flex-col items-center gap-4" aria-label="Pagination">
                  <p className="text-sm text-muted">Showing {from}–{to} of {pagination.total.toLocaleString('en-IN')}</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1} className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface transition hover:border-fg disabled:opacity-40" aria-label="Previous page">
                      <ChevronLeft size={18} />
                    </button>
                    {pageList(pagination.page, pagination.pages).map((p, i) => p === '…' ? (
                      <span key={`gap${i}`} className="px-1 text-muted">…</span>
                    ) : (
                      <button key={p} onClick={() => goToPage(p)} className={`h-10 min-w-10 rounded-full px-3 text-sm font-bold transition ${p === pagination.page ? 'bg-ink text-on-ink' : 'hover:bg-surface-2'}`} aria-current={p === pagination.page ? 'page' : undefined}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface transition hover:border-fg disabled:opacity-40" aria-label="Next page">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </nav>
              )}
            </>
          ) : (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-surface-2"><SearchX size={28} /></span>
              <h2 className="mt-5 font-display text-2xl font-semibold">No products found</h2>
              <p className="mt-2 max-w-sm text-sm text-muted">Try removing a filter or searching for something a little different.</p>
              {activeChips.length > 0 && <button onClick={clearAll} className="btn-primary mt-6">Clear all filters</button>}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" variant="bottom">
        <div className="px-5">{filterPanel}</div>
        <div className="sticky bottom-0 flex gap-3 border-t border-line bg-surface p-4">
          <button onClick={clearAll} className="btn-outline flex-1">Clear all</button>
          <button onClick={() => setFiltersOpen(false)} className="btn-primary flex-1">Show {pagination.total} results</button>
        </div>
      </Modal>

      {/* Mobile sort sheet */}
      <Modal open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by" variant="bottom">
        <div className="p-3 pb-6">
          {SORTS.map(s => (
            <button key={s.value} onClick={() => { set({ sort: s.value === 'popularity' ? '' : s.value }); setSortOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left font-semibold transition hover:bg-surface-2 ${(values.sort || 'popularity') === s.value ? 'text-accent-text' : ''}`}>
              {s.label}
              {(values.sort || 'popularity') === s.value && <Star size={16} className="fill-current" />}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default ProductListing;
