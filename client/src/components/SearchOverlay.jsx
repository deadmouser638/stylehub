import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Camera, Mic, X, Clock, TrendingUp, ArrowRight, LoaderCircle } from 'lucide-react';
import Modal from './ui/Modal';
import api from '../utils/api';
import { UIContext } from '../context/UIContext';
import { CatalogContext, categoryPath } from '../context/CatalogContext';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../utils/storage';
import { formatPrice, sellingPrice } from '../utils/format';

const TRENDING = ['iPhone', 'iPad', 'Gaming laptop', 'Headphones', 'Smartwatch', 'Power bank', 'Fast charger', '4K TV', 'Inverter AC', 'Washing machine'];

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const SearchPanel = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(getRecentSearches);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const { openVisualSearch } = useContext(UIContext);
  const { categories } = useContext(CatalogContext);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/products/suggestions', { params: { q: trimmed } });
        if (!cancelled) setResults(res.data.data);
      } catch {
        if (!cancelled) setResults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [trimmed]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const runSearch = (term) => {
    const clean = term.trim();
    if (!clean) return;
    addRecentSearch(clean);
    onClose();
    navigate(`/products?search=${encodeURIComponent(clean)}`);
  };

  const startVoice = () => {
    if (!SpeechRecognition) return;
    if (listening) { recognitionRef.current?.stop(); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setQuery(transcript);
      if (e.results[e.results.length - 1].isFinal) runSearch(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const showResults = trimmed.length >= 2 && results;
  const hasResults = showResults && (results.products.length || results.categories.length || results.brands.length);

  return (
    <div className="flex max-h-[85vh] flex-col">
      <form onSubmit={(e) => { e.preventDefault(); runSearch(query); }} className="flex items-center gap-2 border-b border-line p-3 sm:p-4" role="search">
        <Search size={20} className="ml-2 shrink-0 text-muted" aria-hidden="true" />
        <input
          data-autofocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={listening ? 'Listening…' : 'Search products, brands and categories'}
          className="min-w-0 flex-1 bg-transparent py-2 text-base font-semibold outline-none"
          aria-label="Search"
          enterKeyHint="search"
        />
        {loading && <LoaderCircle size={18} className="animate-spin text-muted" aria-label="Searching" />}
        {query && (
          <button type="button" onClick={() => setQuery('')} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Clear search">
            <X size={18} />
          </button>
        )}
        {SpeechRecognition && (
          <button type="button" onClick={startVoice} className={`rounded-full p-2 transition ${listening ? 'animate-pulse bg-accent text-on-accent' : 'text-muted hover:bg-surface-2 hover:text-fg'}`} aria-label={listening ? 'Stop voice search' : 'Search by voice'} aria-pressed={listening}>
            <Mic size={18} />
          </button>
        )}
        <button type="button" onClick={openVisualSearch} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-sm font-bold text-fg transition hover:bg-surface-3" aria-label="Search with a photo">
          <Camera size={18} /> <span className="hidden sm:inline">Photo</span>
        </button>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg sm:hidden" aria-label="Close search">
          <X size={20} />
        </button>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {showResults ? (
          hasResults ? (
            <div className="space-y-6">
              {(results.categories.length > 0 || results.brands.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {results.categories.map(c => (
                    <Link key={c.category + c.subcategory} to={categoryPath(c.category, c.subcategory)} onClick={onClose} className="chip">
                      {c.subcategory} <span className="text-muted">in {c.category}</span>
                    </Link>
                  ))}
                  {results.brands.map(b => (
                    <Link key={b.brand} to={`/products?brand=${encodeURIComponent(b.brand)}`} onClick={onClose} className="chip">
                      {b.brand} <span className="text-muted">brand</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.products.length > 0 && (
                <div>
                  <p className="label">Products</p>
                  <ul className="divide-y divide-line">
                    {results.products.map(p => (
                      <li key={p.id}>
                        <Link to={`/product/${p.id}`} onClick={() => { addRecentSearch(trimmed); onClose(); }} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2">
                          <img src={p.image} alt="" className="h-14 w-12 shrink-0 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{p.brand}</p>
                            <p className="truncate text-sm text-muted">{p.name.replace(`${p.brand} `, '')}</p>
                          </div>
                          <span className="shrink-0 text-sm font-extrabold">{formatPrice(sellingPrice(p))}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={() => runSearch(query)} className="btn-dark w-full">
                See all results for “{trimmed}” <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="font-bold">No matches for “{trimmed}”</p>
              <p className="mt-1 text-sm text-muted">Try another word, or search with a photo instead.</p>
              <button onClick={openVisualSearch} className="btn-outline mt-5"><Camera size={16} /> Search with a photo</button>
            </div>
          )
        ) : (
          <div className="space-y-7">
            {recent.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="label mb-0 flex items-center gap-1.5"><Clock size={14} /> Recent searches</p>
                  <button onClick={() => { clearRecentSearches(); setRecent([]); }} className="text-xs font-bold text-accent-text hover:underline">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map(term => <button key={term} onClick={() => runSearch(term)} className="chip">{term}</button>)}
                </div>
              </div>
            )}
            <div>
              <p className="label mb-3 flex items-center gap-1.5"><TrendingUp size={14} /> Trending searches</p>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map(term => <button key={term} onClick={() => runSearch(term)} className="chip">{term}</button>)}
              </div>
            </div>
            <button onClick={openVisualSearch} className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-line-strong p-4 text-left transition hover:border-fg hover:bg-surface-2">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-on-accent"><Camera size={22} /></span>
              <span>
                <span className="block font-extrabold">Snap to shop</span>
                <span className="block text-sm text-muted">Take a photo or upload one from your gallery and we'll find similar products.</span>
              </span>
            </button>
            {categories.length > 0 && (
              <div>
                <p className="label mb-3">Popular categories</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {categories.flatMap(c => c.subcategories.slice(0, 2).map(s => ({ ...s, category: c.name }))).slice(0, 8).map(s => (
                    <Link key={s.category + s.name} to={categoryPath(s.category, s.name)} onClick={onClose} className="group text-center">
                      <div className="aspect-square overflow-hidden rounded-2xl bg-surface-2">
                        {s.image && <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                      </div>
                      <p className="mt-1.5 truncate text-xs font-bold">{s.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="hidden items-center justify-between border-t border-line px-5 py-2.5 text-xs text-muted sm:flex">
        <span>Press <kbd className="rounded border border-line-strong px-1.5 py-0.5 font-sans font-bold">Enter</kbd> to search</span>
        <span><kbd className="rounded border border-line-strong px-1.5 py-0.5 font-sans font-bold">Esc</kbd> to close</span>
      </div>
    </div>
  );
};

const SearchOverlay = () => {
  const { searchOpen, closeSearch } = useContext(UIContext);
  return (
    <Modal open={searchOpen} onClose={closeSearch} title="Search" variant="top" showHeader={false} className="max-h-screen sm:max-h-[85vh]">
      {searchOpen && <SearchPanel onClose={closeSearch} />}
    </Modal>
  );
};

export default SearchOverlay;
