import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCartState] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const { user } = useContext(AuthContext);

  const setCart = useCallback((itemsOrFn) => {
    setCartState(prev => {
      const next = typeof itemsOrFn === 'function' ? itemsOrFn(prev) : itemsOrFn;
      return next;
    });
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get('/cart');
      const serverItems = res.data.data;
      setCartState(Array.isArray(serverItems) ? serverItems : []);
    } catch (err) {
      setCartState([]);
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, user]);

  const addToCart = async (productId, size, quantity = 1) => {
    try {
      const res = await api.post('/cart', { productId, size, quantity });
      const updated = res.data.data;
      if (Array.isArray(updated)) {
        setCart(updated);
      } else {
        await fetchCart();
      }
      toast.success('Added to bag');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding to cart');
      return false;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const res = await api.delete(`/cart/${itemId}`);
      const updated = res.data.data;
      if (Array.isArray(updated)) {
        setCart(updated);
      } else {
        setCart(prev => prev.filter(i => i.id !== itemId));
      }
    } catch (err) {
      setCart(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return removeFromCart(itemId);
    try {
      const res = await api.put(`/cart/${itemId}`, { quantity });
      const updated = res.data.data;
      if (Array.isArray(updated)) {
        setCart(updated);
      } else {
        setCart(prev => prev.map(i => (i.id === itemId ? { ...i, quantity } : i)));
      }
    } catch (err) {
      setCart(prev => prev.map(i => (i.id === itemId ? { ...i, quantity } : i)));
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartLoading,
        fetchCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        appliedCoupon,
        setAppliedCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
