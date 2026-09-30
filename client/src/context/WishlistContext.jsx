import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AuthContext } from './AuthContext';
import { CartContext } from './CartContext';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { user, loading: authLoading } = useContext(AuthContext);
  const { fetchCart } = useContext(CartContext);

  const fetchWishlist = useCallback(async () => {
    if (!user) { setWishlist([]); return; }
    try {
      const res = await api.get('/wishlist');
      setWishlist(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchWishlist();
  }, [authLoading, fetchWishlist]);

  const addToWishlist = async (productId) => {
    if (!user) {
      toast.error('Please login first');
      return false;
    }
    try {
      await api.post(`/wishlist/${productId}`);
      await fetchWishlist();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding to wishlist');
      return false;
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      await fetchWishlist();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error removing from wishlist');
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
