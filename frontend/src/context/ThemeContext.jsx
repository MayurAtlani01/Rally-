import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('rally_theme');
    if (saved === 'day' || saved === 'night') {
      return saved;
    }
    // Fallback to system preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'night';
    }
    return 'day';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-day', 'theme-night', 'dark');
    root.classList.add(`theme-${theme}`);
    if (theme === 'night') {
      root.classList.add('dark');
    }
    root.setAttribute('data-theme', theme);
    localStorage.setItem('rally_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'day' ? 'night' : 'day'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isNight: theme === 'night' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
