// Updating MAKWIN while people are using it.
//
// A new version goes live all at once, and whoever has the site open keeps the
// version they loaded: nothing they are doing is cut short. This notices that a
// newer version is out and swaps to it the next time they change page, the one
// moment there is nothing on screen to lose (a half-written work, an open window,
// a photo being placed). Nobody is reloaded in the middle of something.

declare const __BUILD_ID__: string;

const CHECK_EVERY_MS = 10 * 60 * 1000;
// A tab that keeps failing to swap (offline, say) does not swap on every click.
const RETRY_AFTER_MS = 60 * 1000;
const LAST_SWAP_KEY = 'makwin:ultima-actualizacion';

let newerVersionReady = false;
let started = false;

async function check() {
  if (newerVersionReady || document.visibilityState !== 'visible') return;
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const { build } = (await response.json()) as { build?: string };
    if (build && build !== __BUILD_ID__) newerVersionReady = true;
  } catch {
    // Offline or between versions: the next check will tell.
  }
}

/** Starts watching for a newer version. Does nothing while developing. */
export function watchForUpdates() {
  if (started || __BUILD_ID__ === 'dev') return;
  started = true;
  void check();
  window.setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => void check());
  // A piece of the old version that is no longer online (a poem's typeface, say)
  // only means a newer one is out: the page keeps working with what it has.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    newerVersionReady = true;
  });
}

/**
 * Called when someone has just moved to another page: if a newer version is out,
 * that page opens in it. Returns true when it is swapping.
 */
export function swapToNewerVersionIfReady(): boolean {
  if (!newerVersionReady) return false;
  let last = 0;
  try { last = Number(sessionStorage.getItem(LAST_SWAP_KEY)) || 0; } catch { /* no memory: swap anyway */ }
  if (Date.now() - last < RETRY_AFTER_MS) return false;
  try { sessionStorage.setItem(LAST_SWAP_KEY, String(Date.now())); } catch { /* nothing to remember */ }
  newerVersionReady = false;
  window.location.reload();
  return true;
}
