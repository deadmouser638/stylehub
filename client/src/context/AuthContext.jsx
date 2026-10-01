import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

const USER_CACHE_KEY = 'electrohub_user_cache';

const getCachedUser = () => {
  try {
    const saved = localStorage.getItem(USER_CACHE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(getCachedUser);
  const [loading, setLoading] = useState(() => !getCachedUser() && Boolean(localStorage.getItem('token')));

  const setUser = (newUser) => {
    setUserState(prev => {
      const next = typeof newUser === 'function' ? newUser(prev) : newUser;
      try {
        if (next) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(next));
        else localStorage.removeItem(USER_CACHE_KEY);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data);
        } catch (error) {
          console.error('Auth check error:', error);
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.data.token);
    setUser(res.data.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    ['electrohub_cart_cache', 'electrohub_orders_cache', 'electrohub_addresses_cache', 'electrohub_admin_orders'].forEach(key => localStorage.removeItem(key));
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
