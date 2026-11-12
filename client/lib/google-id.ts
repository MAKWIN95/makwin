// "Continue with Google" asked from our own page. Google's sign-in window then names
// makwin.art, because the question comes from here, instead of the long Supabase
// address it shows when the sign-in goes through Supabase's redirect. Google hands
// back a signed token and Supabase opens the session with it, the same account as before.

/** MAKWIN's Google sign-in client. It is public: Google shows it in every sign-in window. */
export const GOOGLE_CLIENT_ID = '552878038782-a0m21tsttlmk5uu021lco8i3kvkov692.apps.googleusercontent.com';

/** Only these pages are allowed by Google to ask directly; anywhere else the redirect is used. */
const ALLOWED_ORIGINS = ['https://www.makwin.art', 'https://makwin.art', 'https://makwin.vercel.app', 'http://localhost:3010'];

const SCRIPT = 'https://accounts.google.com/gsi/client';

interface CredentialResponse {
  credential?: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: Record<string, unknown>): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
      cancel(): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export function canAskGoogleHere(origin = typeof window !== 'undefined' ? window.location.origin : ''): boolean {
  return ALLOWED_ORIGINS.includes(origin);
}

let loading: Promise<GoogleIdentity> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google) : reject(new Error('google identity missing')));
    script.onerror = () => {
      loading = null;
      reject(new Error('google identity did not load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** A fresh one-use value: Google seals its hash into the token, Supabase checks it against the original. */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return { raw, hashed };
}

/**
 * Puts Google's own button inside `parent` and calls `onToken` with the signed token
 * once the person picks an account. Each call prepares a new one-use value.
 */
export async function mountGoogleButton(
  parent: HTMLElement,
  options: { width: number; language: 'es' | 'en'; onToken: (token: string, nonce: string) => void },
): Promise<void> {
  const google = await loadGoogleIdentity();
  const nonce = await makeNonce();
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: nonce.hashed,
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
    use_fedcm_for_button: false,
    callback: (response: CredentialResponse) => {
      if (response.credential) options.onToken(response.credential, nonce.raw);
    },
  });
  parent.replaceChildren();
  google.accounts.id.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    logo_alignment: 'center',
    width: Math.max(200, Math.min(400, Math.round(options.width))),
    locale: options.language,
  });
}
