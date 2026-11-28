import { useSyncExternalStore } from 'react';

// Whether the side menu (computer) is open. It lives outside the pages so it survives the
// page change a link inside it starts, and can close with its own animation.

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setNavDrawer(next: boolean) {
  if (open === next) return;
  open = next;
  emit();
}

export const toggleNavDrawer = () => setNavDrawer(!open);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNavDrawer(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
