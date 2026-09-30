import React, { useContext } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';

// Icon button that flips between light and dark
export const ThemeToggle = ({ className = '' }) => {
  const { resolvedTheme, toggleTheme } = useContext(ThemeContext);
  const dark = resolvedTheme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      className={`grid h-10 w-10 place-items-center rounded-full text-fg transition hover:bg-surface-2 ${className}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

// Three-way segmented control: Light / Dark / System
export const ThemeSelector = ({ className = '' }) => {
  const { theme, setTheme } = useContext(ThemeContext);
  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className={`grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1 ${className}`} role="radiogroup" aria-label="Theme">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${theme === value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg'}`}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
};
