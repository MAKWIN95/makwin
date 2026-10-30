import { useState, useEffect, useCallback } from 'react';

// The fade only exists while switching, see global.css.
let switchingTimer: ReturnType<typeof setTimeout> | undefined;
function fadeThemeChange() {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  clearTimeout(switchingTimer);
  switchingTimer = setTimeout(() => root.classList.remove('theme-switching'), 600);
}

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      // Get theme from localStorage, or default to dark
      const stored = localStorage.getItem('theme');
      const isDarkTheme = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) || !stored;
      
      setIsDark(isDarkTheme);
      
      // Apply theme to document if not already applied
      const root = document.documentElement;
      if (isDarkTheme) {
        if (!root.classList.contains('dark')) {
          root.classList.add('dark');
        }
        try { localStorage.setItem('theme', 'dark'); } catch(e) {}
      } else {
        root.classList.remove('dark');
        try { localStorage.setItem('theme', 'light'); } catch(e) {}
      }
    } catch (e) {
      setIsDark(true); // default to dark
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const newValue = !prev;
      const root = document.documentElement;
      fadeThemeChange();
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
    fadeThemeChange();
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
