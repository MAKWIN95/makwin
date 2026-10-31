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
  borderColor: string;
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
  const floating = bar.dataset.headerBar === 'floating';
  const element = floating ? bar.querySelector<HTMLElement>('.glass-bar') : bar;
  if (!element) return null;
  const { left, top, width, height } = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  // A pill's radius is far bigger than the bar: only this much of it can be seen change.
  const radius = Math.min(parseFloat(style.borderTopLeftRadius) || 0, height / 2);
  return {
    left,
    top,
    width,
    height,
    borderRadius: `${radius}px`,
    backgroundColor: floating ? style.backgroundColor : getComputedStyle(bar, '::before').backgroundColor,
    boxShadow: style.boxShadow,
    borderColor: floating ? style.borderTopColor : style.borderBottomColor,
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

function fadeRestOfPage(bar: HTMLElement) {
  // The page's own entrance would carry the header with it, so only the rest does it.
  const wrapper = bar.closest<HTMLElement>('.page-enter');
  if (!wrapper) return;
  wrapper.getAnimations().forEach((animation) => animation.cancel());
  Array.from(wrapper.children)
    .filter((child) => child !== bar)
    .forEach((child) => child.animate(
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

  fadeRestOfPage(bar);
  const to = readGlass(bar);
  if (!to) return;

  const leftovers: HTMLElement[] = [];

  // The glass itself: the real one stays out of sight until this one becomes it.
  const glass = document.createElement('div');
  glass.className = 'header-morph-glass';
  glass.setAttribute('aria-hidden', 'true');
  bar.prepend(glass);
  leftovers.push(glass);
  bar.classList.add('header-morphing');
  const place = ({ left, top, width, height, borderRadius, backgroundColor, boxShadow, borderColor }: Glass) => ({
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius,
    backgroundColor,
    boxShadow,
    borderColor,
  });
  const morph = glass.animate([place(from.glass), place(to)], MORPH);
  morph.onfinish = morph.oncancel = () => {
    leftovers.forEach((element) => element.remove());
    // The real glass is simply there at once, not fading in after the other has gone.
    const real = [bar, bar.querySelector<HTMLElement>('.glass-bar')];
    real.forEach((element) => element?.style.setProperty('transition', 'none'));
    bar.classList.remove('header-morphing');
    void bar.offsetHeight;
    real.forEach((element) => element?.style.removeProperty('transition'));
  };

  // What stays travels to its new place and size.
  const now = readParts(bar);
  bar.querySelectorAll<HTMLElement>('[data-morph]').forEach((part) => {
    const name = part.dataset.morph!;
    const box = now[name];
    if (!box) return;
    const was = from.parts[name];
    if (!was) {
      part.animate([{ opacity: 0 }, { opacity: 1 }], FADE_IN);
      return;
    }
    const scale = was.height / box.height;
    part.animate(
      [
        {
          transformOrigin: 'left center',
          transform: `translate(${was.left - box.left}px, ${was.top + was.height / 2 - (box.top + box.height / 2)}px) scale(${scale})`,
        },
        { transformOrigin: 'left center', transform: 'none' },
      ],
      MORPH,
    );
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
    leftovers.push(clone);
    clone.animate([{ opacity: 1 }, { opacity: 0 }], { ...FADE_OUT, fill: 'forwards' });
  });
  bar.querySelectorAll<HTMLElement>('[data-morph-fade]').forEach((element) => {
    if (element.classList.contains('header-morph-leaving')) return;
    element.animate([{ opacity: 0 }, { opacity: 1 }], FADE_IN);
  });
}

// The page coming back into view, without its first-time entrance.
export function returnToPage(page: HTMLElement | null) {
  if (!page || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
}
