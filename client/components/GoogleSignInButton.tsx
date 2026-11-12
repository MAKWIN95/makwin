import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { canAskGoogleHere, mountGoogleButton } from '@/lib/google-id';

interface Props {
  language: 'es' | 'en';
  disabled?: boolean;
  /** Old way: sends the person to Google through Supabase. Used where Google's own button can't load. */
  onRedirect: () => void;
  /** New way: Google's button on our page handed back a signed token. */
  onToken: (token: string, nonce: string) => void;
}

const GOOGLE_G = (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
);

/**
 * Looks like the rest of MAKWIN, but where Google allows it, Google's own button sits
 * invisibly on top and takes the tap, so the account chooser names makwin.art.
 */
export default function GoogleSignInButton({ language, disabled, onRedirect, onToken }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const tokenHandler = useRef(onToken);
  tokenHandler.current = onToken;
  const [ready, setReady] = useState(false);
  const es = language === 'es';

  useEffect(() => {
    if (!canAskGoogleHere() || !wrapper.current || !overlay.current) return;
    let cancelled = false;
    const target = overlay.current;
    mountGoogleButton(target, {
      // Always Google's widest; ours clips it, so every part of our button is Google's tap,
      // even if the page was still settling when it was measured.
      width: 400,
      language,
      onToken: (token, nonce) => tokenHandler.current(token, nonce),
    })
      .then(() => { if (!cancelled) setReady(true); })
      .catch((err) => {
        console.warn('[GoogleSignInButton] Google button unavailable, using redirect:', err);
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
      target.replaceChildren();
      setReady(false);
    };
  }, [language]);

  return (
    <div ref={wrapper} className="group relative w-full mb-6">
      <button
        type="button"
        onClick={ready ? undefined : onRedirect}
        disabled={disabled}
        tabIndex={ready ? -1 : 0}
        aria-hidden={ready}
        className="w-full flex items-center justify-center gap-3 border border-[hsl(var(--border))] rounded-xl py-3 px-4 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] group-hover:bg-[hsl(var(--muted))] active:scale-[0.98] transition-[background-color,transform] duration-200 ease-out disabled:opacity-60"
      >
        {GOOGLE_G}
        {es ? 'Continuar con Google' : 'Continue with Google'}
      </button>
      {/* Google's real button: almost invisible, stretched over ours, so the tap is Google's. */}
      <div
        ref={overlay}
        aria-label={es ? 'Continuar con Google' : 'Continue with Google'}
        className={cn(
          'absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl opacity-[0.011]',
          ready && !disabled ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      />
    </div>
  );
}
