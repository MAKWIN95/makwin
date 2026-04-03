import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      setIsDark(stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches));
    } catch (e) {
      setIsDark(true); // default to dark
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newValue = !prev;
      const root = document.documentElement;
      if (newValue) {
        root.classList.add('dark');
        try { localStorage.setItem('theme', 'dark'); } catch(e) {}
      } else {
        root.classList.remove('dark');
        try { localStorage.setItem('theme', 'light'); } catch(e) {}
      }
      return newValue;
    });
  }, []);

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    const isDarkTheme = theme === 'dark';
    setIsDark(isDarkTheme);
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.add('dark');
      try { localStorage.setItem('theme', 'dark'); } catch(e) {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('theme', 'light'); } catch(e) {}
    }
  }, []);

  return { isDark, toggleTheme, setTheme };
}
