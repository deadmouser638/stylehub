import React, { createContext, useCallback, useEffect, useState } from 'react';

export const UIContext = createContext();

// Global overlays that can be opened from anywhere: search palette, visual search, quick view
export const UIProvider = ({ children }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [visualSearchOpen, setVisualSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openVisualSearch = useCallback(() => { setSearchOpen(false); setVisualSearchOpen(true); }, []);
  const closeVisualSearch = useCallback(() => setVisualSearchOpen(false), []);
  const openQuickView = useCallback((product) => setQuickViewProduct(product), []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  // Keyboard shortcuts: Ctrl/Cmd+K or "/" opens search
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <UIContext.Provider value={{
      searchOpen, openSearch, closeSearch,
      visualSearchOpen, openVisualSearch, closeVisualSearch,
      quickViewProduct, openQuickView, closeQuickView,
    }}>
      {children}
    </UIContext.Provider>
  );
};
