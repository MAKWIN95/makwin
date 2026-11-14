// Proof that a person, not a bot, is creating an account, signing in or asking for
// an email. Cloudflare Turnstile decides on its own: almost everyone passes without
// seeing anything; only a suspicious visit is asked to tick a box, which then
// appears at the bottom of the screen. Supabase checks the proof before acting.

/** Public by design: it only names the MAKWIN widget, the secret stays in Supabase. */
const SITE_KEY = '0x4AAAAAAGAPknSn2C0u2yCr';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** A check that has not finished by then is given up, so a form never hangs. */
const GIVE_UP_MS = 120_000;

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
}

declare global {
  interface Window { turnstile?: Turnstile }
}

let loading: Promise<Turnstile | null> | null = null;

function loadTurnstile(): Promise<Turnstile | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => { loading = null; resolve(null); };
    document.head.appendChild(script);
  });
  return loading;
}

function savedLanguage(): 'es' | 'en' {
  try { return localStorage.getItem('language') === 'en' ? 'en' : 'es'; } catch { return 'es'; }
}

/** Where a box shows up when Cloudflare wants a tick; it fades in and out, never pops. */
function holder(): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('data-captcha', '');
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: '24px', zIndex: '2147483000',
    transform: 'translate(-50%, 12px)', opacity: '0', pointerEvents: 'none',
    transition: 'opacity 240ms ease-out, transform 240ms ease-out',
  });
  document.body.appendChild(el);
  return el;
}

function show(el: HTMLDivElement, visible: boolean) {
  el.style.opacity = visible ? '1' : '0';
  el.style.transform = visible ? 'translate(-50%, 0)' : 'translate(-50%, 12px)';
  el.style.pointerEvents = visible ? 'auto' : 'none';
}

/**
 * A fresh, single-use proof for the next Supabase call. Undefined when Cloudflare
 * cannot be reached: the call then goes without it, and Supabase decides.
 */
export async function captchaToken(language: 'es' | 'en' = savedLanguage()): Promise<string | undefined> {
  const turnstile = await loadTurnstile();
  if (!turnstile) return undefined;
  const el = holder();
  return new Promise((resolve) => {
    let id = '';
    let done = false;
    const finish = (token?: string) => {
      if (done) return;
      done = true;
      show(el, false);
      window.setTimeout(() => {
        try { if (id) turnstile.remove(id); } catch { /* already gone */ }
        el.remove();
      }, 260);
      resolve(token);
    };
    const timer = window.setTimeout(() => finish(undefined), GIVE_UP_MS);
    try {
      id = turnstile.render(el, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        language,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        'before-interactive-callback': () => show(el, true),
        'after-interactive-callback': () => show(el, false),
        callback: (token: string) => { window.clearTimeout(timer); finish(token); },
        'error-callback': () => { window.clearTimeout(timer); finish(undefined); },
        'expired-callback': () => { window.clearTimeout(timer); finish(undefined); },
      });
    } catch {
      window.clearTimeout(timer);
      finish(undefined);
    }
  });
}
