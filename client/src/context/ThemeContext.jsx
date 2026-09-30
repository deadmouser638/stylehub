import React, { createContext, useCallback, useEffect, useState } from 'react';

export const ThemeContext = createContext();

const readSaved = () => {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch {
    return 'system';
  }
};

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export const ThemeProvider = ({ children }) => {
  // 'light' | 'dark' | 'system'
  const [theme, setThemeState] = useState(readSaved);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
