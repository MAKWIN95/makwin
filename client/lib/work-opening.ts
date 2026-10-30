// A work opens from where it was: the card's place is remembered on the tap, and
// the big version starts there and travels to its own place on the new page.
interface Opening {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  at: number;
}

const STILL_FRESH_MS = 1500;
const FLIGHT = { duration: 420, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' };
const SHOWS_THROUGH_FROM = 0.35;

let last: Opening | null = null;

export function rememberOpening(id: string, from: Element | null | undefined) {
  if (!from) return;
  const { left, top, width, height } = from.getBoundingClientRect();
  last = { id, left, top, width, height, at: Date.now() };
}

// Only right after the tap: coming back to a work later just shows it.
export function openingOf(id: string | undefined): Opening | null {
  return last?.id === id && Date.now() - last.at < STILL_FRESH_MS ? last : null;
}

function fly(target: HTMLElement, from: Opening) {
  const to = target.getBoundingClientRect();
  if (!to.width || !to.height) return;
  const scale = from.width / to.width;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  // Something other than a photo changes shape on the way, so it also appears as it goes.
  const isImage = target instanceof HTMLImageElement;
  const zIndex = target.style.zIndex;
  const position = target.style.position;
  target.style.zIndex = '30';
  if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
  target.style.visibility = '';
  const flight = target.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: isImage ? 1 : SHOWS_THROUGH_FROM },
      { transform: 'none', opacity: 1 },
    ],
    FLIGHT,
  );
  flight.onfinish = flight.oncancel = () => {
    target.style.zIndex = zIndex;
    target.style.position = position;
  };
}

export function flyFrom(target: HTMLElement, from: Opening) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (target instanceof HTMLImageElement && !target.complete) {
    // Not in memory after all: it waits out of sight and flies as soon as it arrives.
    target.style.visibility = 'hidden';
    const show = () => {
      target.style.visibility = '';
    };
    target.addEventListener('load', () => fly(target, from), { once: true });
    target.addEventListener('error', show, { once: true });
    return;
  }
  fly(target, from);
}
