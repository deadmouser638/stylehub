import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const { user, loading: authLoading } = useContext(AuthContext);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart([]);
      setAppliedCoupon(null);
      setCartLoading(false);
      return;
    }
    try {
      const res = await api.get('/cart');
      setCart(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchCart();
  }, [authLoading, fetchCart]);

  const addToCart = async (productId, size, quantity = 1) => {
    if (!user) {
      toast.error('Please login first');
      return false;
    }
    try {
      await api.post('/cart', { productId, size, quantity });
      await fetchCart();
      toast.success('Added to bag');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding to cart');
      return false;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`);
      await fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error removing item');
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await api.put(`/cart/${itemId}`, { quantity });
      await fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating quantity');
    }
  };

  return (
    <CartContext.Provider value={{ cart, cartLoading, fetchCart, addToCart, removeFromCart, updateQuantity, appliedCoupon, setAppliedCoupon }}>
      {children}
    </CartContext.Provider>
  );
};
