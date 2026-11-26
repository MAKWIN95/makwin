// Visit statistics with Umami: no cookies, no IP stored, no profile of anyone.
// It only runs on the real site, so tests, previews and localhost are never counted.

/** The site's id in Umami (public: it is visible in every page that loads the script). */
export const UMAMI_WEBSITE_ID = '637ee074-4b15-4ec8-bef0-38aba142b482';

const COUNTED_HOSTS = ['www.makwin.art', 'makwin.art', 'makwin.vercel.app'];

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window { umami?: { track: (name: string, data?: EventData) => void } }
}

/**
 * Counts one action in Umami (what happened, never who did it: no emails, names or ids).
 * Does nothing where Umami is not loaded (localhost, tests, previews).
 */
export function track(name: string, data?: EventData): void {
  try {
    window.umami?.track(name, data);
  } catch {
    /* statistics must never break the page */
  }
}

/* ---------- business cards: each card's QR opens makwin.art/?t=<design> ---------- */

const CARD_KEY = 'makwin-tarjeta';

/** The card design named in a QR link (?t=gigante), or null. Only short lowercase names count. */
export function cardTagFrom(search: string): string | null {
  try {
    const t = new URLSearchParams(search).get('t');
    return t && /^[a-z0-9-]{1,24}$/.test(t) ? t : null;
  } catch {
    return null;
  }
}

/** The card that brought this visit, kept only for this tab (so a sign-up in the same visit can say so). */
export function cardOrigin(): EventData {
  try {
    const t = sessionStorage.getItem(CARD_KEY);
    return t ? { tarjeta: t } : {};
  } catch {
    return {};
  }
}

/** Umami loads a moment after the page: wait for it (up to 15 s) before counting. */
function trackWhenReady(name: string, data: EventData, then?: () => void, tries = 30): void {
  if (window.umami) { track(name, data); then?.(); return; }
  if (tries > 0) setTimeout(() => trackWhenReady(name, data, then, tries - 1), 500);
}

/** A visit from a card's QR: count one «tarjeta» scan with its design, then tidy the address. */
function countCardScan(): void {
  const tag = cardTagFrom(window.location.search);
  if (!tag) return;
  try { sessionStorage.setItem(CARD_KEY, tag); } catch { /* private mode: the scan still counts */ }
  trackWhenReady('tarjeta', { modelo: tag }, () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('t');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    } catch { /* keep the address as it is */ }
  });
}

export function startAnalytics(): void {
  if (!UMAMI_WEBSITE_ID || typeof document === 'undefined') return;
  if (!COUNTED_HOSTS.includes(window.location.hostname)) return;
  if (document.querySelector('script[data-website-id]')) return;
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cloud.umami.is/script.js';
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  script.dataset.domains = COUNTED_HOSTS.join(',');
  document.head.appendChild(script);
  countCardScan();
}
