import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, Star, Check } from 'lucide-react';
import { COLOR_SWATCHES } from '../utils/format';
import { categoryPath } from '../context/CatalogContext';

export const PRICE_PRESETS = [
  { label: 'Under ₹15,000', min: '', max: '14999' },
  { label: '₹15,000 – ₹30,000', min: '15000', max: '30000' },
  { label: '₹30,000 – ₹60,000', min: '30000', max: '60000' },
  { label: '₹60,000 – ₹1,00,000', min: '60000', max: '100000' },
  { label: '₹1,00,000 & above', min: '100000', max: '' },
];

const Section = ({ title, children, defaultOpen = true, count }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-5 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <span className="text-sm font-extrabold uppercase tracking-wider">
          {title}{count > 0 && <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-on-accent">{count}</span>}
        </span>
        <ChevronDown size={18} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-4 animate-fade-in">{children}</div>}
    </div>
  );
};

const CheckRow = ({ checked, onChange, label, count }) => (
  <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
    <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${checked ? 'border-accent bg-accent text-on-accent' : 'border-line-strong'}`} aria-hidden="true">
      {checked && <Check size={13} strokeWidth={3} />}
    </span>
    <span className={`flex-1 truncate ${checked ? 'font-bold' : 'font-medium'}`}>{label}</span>
    {count !== undefined && <span className="text-xs text-muted">{count}</span>}
  </label>
);

/**
 * Filter controls for the listing page. `values` are the current URL params,
 * `toggle(key, value)` flips a value in a multi-select param, `set(changes)` sets params.
 */
const FilterPanel = ({ facets, values, toggle, set, category, categories }) => {
  const [brandQuery, setBrandQuery] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: values.minPrice || '', max: values.maxPrice || '' });

  const selected = (key) => (values[key] ? values[key].split(',') : []);
  const brands = facets.brands.filter(b => b.value.toLowerCase().includes(brandQuery.toLowerCase()));
  const visibleBrands = showAllBrands || brandQuery ? brands : brands.slice(0, 8);

  const applyPrice = (e) => {
    e.preventDefault();
    set({ minPrice: priceDraft.min, maxPrice: priceDraft.max });
  };

  return (
    <div>
      {!category && categories.length > 0 && (
        <Section title="Category">
          <ul className="space-y-1">
            {categories.map(c => (
              <li key={c.name}>
                <Link to={categoryPath(c.name)} className="flex items-center justify-between rounded-lg py-1.5 text-sm font-semibold hover:text-accent-text">
                  {c.name} <span className="text-xs font-medium text-muted">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Price" count={values.minPrice || values.maxPrice ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map(p => {
            const active = (values.minPrice || '') === p.min && (values.maxPrice || '') === p.max;
            return (
              <button key={p.label} onClick={() => { set(active ? { minPrice: '', maxPrice: '' } : { minPrice: p.min, maxPrice: p.max }); setPriceDraft({ min: active ? '' : p.min, max: active ? '' : p.max }); }} className={`chip text-xs ${active ? 'chip-active' : ''}`} aria-pressed={active}>
                {p.label}
              </button>
            );
          })}
        </div>
        <form onSubmit={applyPrice} className="mt-4 flex items-center gap-2">
          <label className="sr-only" htmlFor="price-min">Minimum price</label>
          <input id="price-min" type="number" min="0" inputMode="numeric" placeholder={`₹${facets.price.min || 0}`} value={priceDraft.min} onChange={e => setPriceDraft({ ...priceDraft, min: e.target.value })} className="input px-3 py-2" />
          <span className="text-muted">–</span>
          <label className="sr-only" htmlFor="price-max">Maximum price</label>
          <input id="price-max" type="number" min="0" inputMode="numeric" placeholder={`₹${facets.price.max || ''}`} value={priceDraft.max} onChange={e => setPriceDraft({ ...priceDraft, max: e.target.value })} className="input px-3 py-2" />
          <button type="submit" className="btn-dark shrink-0 px-4 py-2">Go</button>
        </form>
      </Section>

      {facets.brands.length > 0 && (
        <Section title="Brand" count={selected('brand').length}>
          {facets.brands.length > 8 && (
            <div className="relative mb-2">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="search" value={brandQuery} onChange={e => setBrandQuery(e.target.value)} placeholder="Search brands" aria-label="Search brands" className="input py-2 pl-9 text-sm" />
            </div>
          )}
          <div className="max-h-72 overflow-y-auto pr-1">
            {visibleBrands.map(b => (
              <CheckRow key={b.value} label={b.value} count={b.count} checked={selected('brand').includes(b.value)} onChange={() => toggle('brand', b.value)} />
            ))}
            {brands.length === 0 && <p className="py-2 text-sm text-muted">No brands match.</p>}
          </div>
          {!brandQuery && brands.length > 8 && (
            <button onClick={() => setShowAllBrands(!showAllBrands)} className="link mt-2 text-sm">
              {showAllBrands ? 'Show less' : `+ ${brands.length - 8} more`}
            </button>
          )}
        </Section>
      )}

      {facets.colors.length > 0 && (
        <Section title="Colour" count={selected('color').length}>
          <div className="grid grid-cols-2 gap-2">
            {facets.colors.map(c => {
              const active = selected('color').includes(c.value);
              return (
                <button key={c.value} onClick={() => toggle('color', c.value)} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition ${active ? 'border-fg bg-surface-2 font-bold' : 'border-line hover:border-line-strong'}`} aria-pressed={active}>
                  <span className="h-5 w-5 shrink-0 rounded-full border border-line-strong" style={{ background: COLOR_SWATCHES[c.value] || c.value }} aria-hidden="true" />
                  <span className="flex-1 truncate">{c.value}</span>
                  <span className="text-xs text-muted">{c.count}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {facets.sizes.length > 0 && (
        <Section title="Size" count={selected('size').length}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map(s => {
              const active = selected('size').includes(s.value);
              return (
                <button key={s.value} onClick={() => toggle('size', s.value)} className={`min-w-11 rounded-full border px-3 py-1.5 text-xs font-bold transition ${active ? 'border-fg bg-ink text-on-ink' : 'border-line-strong hover:border-fg'}`} aria-pressed={active}>
                  {s.value}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {Object.entries(facets.specs || {}).map(([key, options], i) => (
        <Section key={key} title={key} count={selected(`spec_${key}`).length} defaultOpen={i < 4}>
          {options.map(o => (
            <CheckRow key={o.value} label={o.value} count={o.count} checked={selected(`spec_${key}`).includes(o.value)} onChange={() => toggle(`spec_${key}`, o.value)} />
          ))}
        </Section>
      ))}

      <Section title="Discount" count={values.discount ? 1 : 0} defaultOpen={false}>
        {[10, 20, 30, 40, 50, 60].map(d => (
          <label key={d} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
            <input type="radio" name="discount" checked={values.discount === String(d)} onChange={() => set({ discount: String(d) })} onClick={() => values.discount === String(d) && set({ discount: '' })} className="h-4 w-4 accent-[var(--accent)]" />
            <span className={values.discount === String(d) ? 'font-bold' : 'font-medium'}>{d}% and above</span>
          </label>
        ))}
      </Section>

      <Section title="Customer rating" count={values.minRating ? 1 : 0} defaultOpen={false}>
        {[4, 3].map(r => (
          <label key={r} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
            <input type="radio" name="rating" checked={values.minRating === String(r)} onChange={() => set({ minRating: String(r) })} onClick={() => values.minRating === String(r) && set({ minRating: '' })} className="h-4 w-4 accent-[var(--accent)]" />
            <span className={`flex items-center gap-1 ${values.minRating === String(r) ? 'font-bold' : 'font-medium'}`}>{r}<Star size={13} className="fill-star text-star" /> & above</span>
          </label>
        ))}
      </Section>
    </div>
  );
};

export default FilterPanel;
