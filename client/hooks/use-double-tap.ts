import { useEffect, useRef, type MouseEvent } from 'react';

const WINDOW_MS = 260;

// Double tap or double click, like every social network. A single tap waits a
// moment to be sure it is single; without onSingle nothing has to wait.
export function useDoubleTap(onDouble: () => void, onSingle?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastTap = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (event: MouseEvent) => {
    // Keyboard activation, and opening in a new tab, stay immediate and native.
    if (event.detail === 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    const now = Date.now();
    if (now - lastTap.current < WINDOW_MS) {
      lastTap.current = 0;
      clearTimeout(timer.current);
      onDouble();
      return;
    }
    lastTap.current = now;
    if (onSingle) timer.current = setTimeout(onSingle, WINDOW_MS);
  };
}
