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
}
