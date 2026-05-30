import { useEffect } from 'react';
import gsap from 'gsap';

export function usePageTransition() {
  useEffect(() => {
    // Animate page in when it mounts
    const pageElement = document.querySelector('.page-enter');
    if (pageElement) {
      gsap.from(pageElement, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: 'power3.out',
      });
    }

    // Add transition overlay for smooth navigation
    const originalNavigate = window.history.pushState;
    const setupTransitionListener = () => {
      document.addEventListener('click', (e) => {
        const link = (e.target as HTMLElement).closest('a');
        if (link && link.getAttribute('href')?.startsWith('/')) {
          const href = link.getAttribute('href');
          if (href) {
            createTransitionOverlay(href);
          }
        }
      });
    };

    setupTransitionListener();
  }, []);
}

export function createTransitionOverlay(path: string) {
  const overlay = document.createElement('div');
  overlay.className = 'page-transition-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: hsl(var(--background));
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
  `;
  document.body.appendChild(overlay);

  gsap.to(overlay, {
    opacity: 1,
    duration: 0.18,
    ease: 'power1.in',
  });
}
