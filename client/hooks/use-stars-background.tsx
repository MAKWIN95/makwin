import { useEffect } from 'react';

// Runs after every render on purpose: a page may only show its container once it
// has finished loading, and a container that already has its stars is left alone.
// The stars carry no theme: the styles show them in dark mode and hide them in light.
export function useStarsBackground(containerId: string = 'stars-background') {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.childElementCount > 0) return;

    // Every star is a running animation: phones get fewer so scrolling stays smooth.
    const mainStars = window.matchMedia('(max-width: 640px), (pointer: coarse)').matches ? 30 : 80;
    for (let i = 0; i < mainStars; i++) {
      const star = document.createElement('div');
      star.className = 'star';

      // bias more stars towards the left side for composition
      let x: number;
      if (i < mainStars * 0.75) {
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
  });
}
