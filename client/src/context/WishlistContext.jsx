import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AuthContext } from './AuthContext';
import { CartContext } from './CartContext';

export const WishlistContext = createContext();

const LOCAL_WISHLIST_KEY = 'electrohub_wishlist_cache';

const getLocalWishlist = () => {
  try {
    const saved = localStorage.getItem(LOCAL_WISHLIST_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLocalWishlist = (items) => {
  try {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items || []));
  } catch {}
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlistState] = useState(getLocalWishlist);
  const { user, loading: authLoading } = useContext(AuthContext);
  const { fetchCart } = useContext(CartContext);

  const setWishlist = useCallback((itemsOrFn) => {
    setWishlistState(prev => {
      const next = typeof itemsOrFn === 'function' ? itemsOrFn(prev) : itemsOrFn;
      saveLocalWishlist(next);
      return next;
    });
  }, []);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistState(getLocalWishlist());
      return;
    }
    try {
      const res = await api.get('/wishlist');
      const serverItems = res.data.data;
      setWishlistState(serverItems);
      saveLocalWishlist(serverItems);
    } catch (err) {
      console.error(err);
      setWishlistState(getLocalWishlist());
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      const local = getLocalWishlist();
      if (local.length > 0) {
        Promise.all(local.map(item => api.post(`/wishlist/${item.product_id || item.id}`).catch(() => {})))
          .finally(() => fetchWishlist());
      } else {
        fetchWishlist();
      }
    } else if (!authLoading && !user) {
      setWishlistState(getLocalWishlist());
    }
  }, [authLoading, user, fetchWishlist]);

  const addToWishlist = async (productId) => {
    if (user) {
      try {
        await api.post(`/wishlist/${productId}`);
        await fetchWishlist();
        toast.success('Added to wishlist');
        return true;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error adding to wishlist');
        return false;
      }
    } else {
      setWishlist(prev => {
        if (prev.some(item => (item.product_id === productId || item.id === productId))) return prev;
        return [...prev, { id: productId, product_id: productId }];
      });
      toast.success('Saved to wishlist');
      return true;
    }
  };

  const removeFromWishlist = async (productId) => {
    if (user) {
      try {
        await api.delete(`/wishlist/${productId}`);
        await fetchWishlist();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error removing from wishlist');
      }
    } else {
      setWishlist(prev => prev.filter(i => (i.product_id !== productId && i.id !== productId)));
    }
  };

  const moveToCart = async (productId, size) => {
    try {
      await api.post(`/wishlist/${productId}/move-to-cart`, { size });
      await Promise.all([fetchWishlist(), fetchCart()]);
      toast.success('Moved to bag');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error moving to cart');
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlist, fetchWishlist, addToWishlist, removeFromWishlist, moveToCart }}>
      {children}
    </WishlistContext.Provider>
  );
};
