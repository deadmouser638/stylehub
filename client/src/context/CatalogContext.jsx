import React, { createContext, useEffect, useState } from 'react';
import api from '../utils/api';

export const CatalogContext = createContext({ categories: [], loading: true });

// Display order for the top-level categories
export const CATEGORY_ORDER = ['Mobiles', 'Tablets', 'Laptops', 'TVs', 'Cameras', 'Accessories', 'Refrigerators', 'Air Conditioners', 'Home Appliances'];

export const CatalogProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products/categories')
      .then(res => {
        const sorted = [...res.data.data].sort(
          (a, b) => (CATEGORY_ORDER.indexOf(a.name) + 99) % 99 - (CATEGORY_ORDER.indexOf(b.name) + 99) % 99
        );
        setCategories(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <CatalogContext.Provider value={{ categories, loading }}>
      {children}
    </CatalogContext.Provider>
  );
};

export const categoryPath = (category, subcategory) => {
  const base = `/products/${encodeURIComponent(category)}`;
  return subcategory ? `${base}?subcategory=${encodeURIComponent(subcategory)}` : base;
};
