import { createContext } from 'react';

// False while a page is kept alive out of sight, ready for the way back.
export const PageShown = createContext(true);

// The floating bar and the flat bar are one header changing shape: the shape and
// the places of what is in it are read just before the page changes, and the new
// header starts from them and travels to its own.
interface Glass {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: string;
  backgroundColor: string;
  boxShadow: string;
  borderTopColor: string;
  borderRightColor: string;
  borderBottomColor: string;
  borderLeftColor: string;
}

interface Remembered {
  shape: string;
  glass: Glass;
  parts: Record<string, DOMRect>;
  fading: { clone: HTMLElement; box: DOMRect }[];
  windowWidth: number;
  at: number;
}

const STILL_FRESH_MS = 1500;
const MORPH = { duration: 420, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' };
const FADE_OUT = { duration: 170, easing: 'ease-out' };
const FADE_IN = { duration: 280, delay: 110, easing: 'ease-out', fill: 'backwards' } as const;
const REST = { duration: 420, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' };

let last: Remembered | null = null;

function readGlass(bar: HTMLElement): Glass | null {
  const layer = bar.querySelector<HTMLElement>('[data-header-glass]');
  if (!layer) return null;
  const { left, top, width, height } = layer.getBoundingClientRect();
  const style = getComputedStyle(layer);
  // A pill's radius is far bigger than the bar: only this much of it can be seen change.
  const radius = Math.min(parseFloat(style.borderTopLeftRadius) || 0, height / 2);
  return {
    left,
    top,
    width,
    height,
    borderRadius: `${radius}px`,
    backgroundColor: style.backgroundColor,
    boxShadow: style.boxShadow,
    borderTopColor: style.borderTopColor,
    borderRightColor: style.borderRightColor,
    borderBottomColor: style.borderBottomColor,
    borderLeftColor: style.borderLeftColor,
  };
}

function readParts(bar: HTMLElement) {
  const parts: Record<string, DOMRect> = {};
  bar.querySelectorAll<HTMLElement>('[data-morph]').forEach((part) => {
    if (part.getClientRects().length) parts[part.dataset.morph!] = part.getBoundingClientRect();
  });
  return parts;
}

// Called while the old page is still on screen.
export function rememberHeader() {
  const bar = Array.from(document.querySelectorAll<HTMLElement>('[data-header-bar]'))
    .find((candidate) => candidate.getClientRects().length > 0);
  const glass = bar && readGlass(bar);
  if (!bar || !glass) {
    last = null;
    return;
  }
  const fading = Array.from(bar.querySelectorAll<HTMLElement>('[data-morph-fade]'))
    .filter((element) => element.getClientRects().length > 0)
    .map((element) => {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[id]').forEach((inner) => inner.removeAttribute('id'));
      clone.removeAttribute('id');
      return { clone, box: element.getBoundingClientRect() };
    });
  last = { shape: bar.dataset.headerBar!, glass, parts: readParts(bar), fading, windowWidth: window.innerWidth, at: Date.now() };
}

function fadeRestOfPage(bar: HTMLElement): Animation[] {
  // The page's own entrance would carry the header with it, so only the rest does it.
  const wrapper = bar.closest<HTMLElement>('.page-enter');
  if (!wrapper) return [];
  wrapper.getAnimations().forEach((animation) => animation.cancel());
  return Array.from(wrapper.children)
    .filter((child) => child !== bar)
    .map((child) => child.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      REST,
    ));
}

export function morphHeader(bar: HTMLElement | null) {
  const from = last;
  last = null;
  if (!bar || !from) return;
  if (from.shape === bar.dataset.headerBar || from.windowWidth !== window.innerWidth) return;
  if (Date.now() - from.at > STILL_FRESH_MS) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const moves = fadeRestOfPage(bar);
  const to = readGlass(bar);
  if (!to) return;

  // The glass itself: it starts as the old one and ends exactly as its own resting self.
  const layer = bar.querySelector<HTMLElement>('[data-header-glass]')!;
  const place = (glass: Glass) => ({
    left: `${glass.left - to.left}px`,
    top: `${glass.top - to.top}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${glass.width}px`,
    height: `${glass.height}px`,
    borderRadius: glass.borderRadius,
    backgroundColor: glass.backgroundColor,
    boxShadow: glass.boxShadow,
    borderTopColor: glass.borderTopColor,
    borderRightColor: glass.borderRightColor,
    borderBottomColor: glass.borderBottomColor,
    borderLeftColor: glass.borderLeftColor,
  });
  moves.push(layer.animate([place(from.glass), place(to)], MORPH));

  // What stays travels to its new place and size.
  const now = readParts(bar);
  bar.querySelectorAll<HTMLElement>('[data-morph]').forEach((part) => {
    const name = part.dataset.morph!;
    const box = now[name];
    if (!box) return;
    const was = from.parts[name];
    if (!was) {
      moves.push(part.animate([{ opacity: 0 }, { opacity: 1 }], FADE_IN));
      return;
    }
    const scale = was.height / box.height;
    moves.push(part.animate(
      [
        {
          transformOrigin: 'left center',
          transform: `translate(${was.left - box.left}px, ${was.top + was.height / 2 - (box.top + box.height / 2)}px) scale(${scale})`,
        },
        { transformOrigin: 'left center', transform: 'none' },
      ],
      MORPH,
    ));
  });

  // What only the old header had leaves; what only this one has arrives.
  from.fading.forEach(({ clone, box }) => {
    clone.classList.add('header-morph-leaving');
    clone.setAttribute('aria-hidden', 'true');
    clone.style.left = `${box.left}px`;
    clone.style.top = `${box.top}px`;
    clone.style.width = `${box.width}px`;
    clone.style.height = `${box.height}px`;
    bar.append(clone);
    const leaving = clone.animate([{ opacity: 1 }, { opacity: 0 }], { ...FADE_OUT, fill: 'forwards' });
    leaving.onfinish = leaving.oncancel = () => clone.remove();
    moves.push(leaving);
  });
  bar.querySelectorAll<HTMLElement>('[data-morph-fade]').forEach((element) => {
    if (element.classList.contains('header-morph-leaving')) return;
    moves.push(element.animate([{ opacity: 0 }, { opacity: 1 }], FADE_IN));
  });

  // A heavy new page takes a moment to paint. Everything waits on its first frame
  // until then, or that moment is spent and the change is already over when it shows.
  moves.forEach((move) => move.pause());
  requestAnimationFrame(() => requestAnimationFrame(() => moves.forEach((move) => move.play())));
}

// The page coming back into view, without its first-time entrance.
export function returnToPage(page: HTMLElement | null) {
  if (!page || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
}
