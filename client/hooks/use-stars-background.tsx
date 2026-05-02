import { useEffect } from 'react';

export function useStarsBackground(containerId: string = 'stars-background') {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Detect current theme
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Create 80 main stars
    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div');
      star.className = isDarkMode ? 'star' : 'star star--light';
      
      // bias more stars towards the left side for composition
      let x: number;
      if (i < 60) {
        x = Math.random() * 40; // left-heavy
      } else {
        x = 40 + Math.random() * 60;
      }
      
      const y = Math.random() * 100;
      const size = Math.random() * 2 + 0.5;
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 1;

      star.style.left = x + '%';
      star.style.top = y + '%';
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.setProperty('--duration', duration + 's');
      star.style.setProperty('--delay', delay + 's');

      container.appendChild(star);
    }

    // If in light theme, add extra stars for density
    if (!isDarkMode) {
      for (let i = 0; i < 40; i++) {
        const star = document.createElement('div');
        star.className = 'star star--light';
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 0.5;
        star.style.left = x + '%';
        star.style.top = y + '%';
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.opacity = '0.6';
        container.appendChild(star);
      }
    }
  }, [containerId]);
}
