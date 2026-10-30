import { useEffect } from 'react';

let locks = 0;

// Keeps the page behind an open window or menu still. Counted, so closing one of
// two stacked windows does not release the page while the other is still open.
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) document.documentElement.classList.add('scroll-locked');
    return () => {
      if (--locks === 0) document.documentElement.classList.remove('scroll-locked');
    };
  }, [active]);
}
