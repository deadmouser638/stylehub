import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

const LOCAL_CART_KEY = 'electrohub_cart_cache';

const getLocalCart = () => {
  try {
    const saved = localStorage.getItem(LOCAL_CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLocalCart = (items) => {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items || []));
  } catch {}
};

export const CartProvider = ({ children }) => {
  const [cart, setCartState] = useState(getLocalCart);
  const [cartLoading, setCartLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const { user, loading: authLoading } = useContext(AuthContext);

  const setCart = useCallback((itemsOrFn) => {
    setCartState(prev => {
      const next = typeof itemsOrFn === 'function' ? itemsOrFn(prev) : itemsOrFn;
      saveLocalCart(next);
      return next;
    });
  }, []);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartState(getLocalCart());
      setCartLoading(false);
      return;
    }
    try {
      const res = await api.get('/cart');
      const serverItems = res.data.data;
      setCartState(serverItems);
      saveLocalCart(serverItems);
    } catch (err) {
      console.error('Error fetching cart:', err);
      // Fallback to local storage if API is temporarily unreachable
      setCartState(getLocalCart());
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  // Sync local guest cart items to user account upon login
  useEffect(() => {
    if (!authLoading && user) {
      const localItems = getLocalCart();
      if (localItems.length > 0) {
        // Sync local items to server
        Promise.all(
          localItems.map(item =>
            api.post('/cart', {
              productId: item.product_id || item.id,
              size: item.size || null,
              quantity: item.quantity || 1,
            }).catch(() => {})
          )
        ).finally(() => {
          fetchCart();
        });
      } else {
        fetchCart();
      }
    } else if (!authLoading && !user) {
      setCartState(getLocalCart());
      setCartLoading(false);
    }
  }, [authLoading, user, fetchCart]);

  const addToCart = async (productId, size, quantity = 1) => {
    if (user) {
      try {
        await api.post('/cart', { productId, size, quantity });
        await fetchCart();
        toast.success('Added to bag');
        return true;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error adding to cart');
        return false;
      }
    } else {
      // Guest cart in localStorage
      try {
        const prodRes = await api.get(`/products/${productId}`);
        const product = prodRes.data.data.product;
        const newItem = {
          id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          product_id: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          discount_percent: product.discount_percent,
          stock: product.stock,
          images: product.images,
          size: size || null,
          quantity: quantity,
        };

        setCart(prev => {
          const existingIndex = prev.findIndex(
            i => (i.product_id === product.id || i.id === product.id) && i.size === size
          );
          if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex].quantity += quantity;
            return updated;
          }
          return [...prev, newItem];
        });
        toast.success('Added to bag');
        return true;
      } catch (err) {
        toast.error('Could not add product to bag');
        return false;
      }
    }
  };

  const removeFromCart = async (itemId) => {
    if (user && !String(itemId).startsWith('guest_')) {
      try {
        await api.delete(`/cart/${itemId}`);
        await fetchCart();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error removing item');
      }
    } else {
      setCart(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return removeFromCart(itemId);

    if (user && !String(itemId).startsWith('guest_')) {
      try {
        await api.put(`/cart/${itemId}`, { quantity });
        await fetchCart();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error updating quantity');
      }
    } else {
      setCart(prev =>
        prev.map(i => (i.id === itemId ? { ...i, quantity } : i))
      );
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
