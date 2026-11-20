import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Images, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { RULES_LINK, WHAT_TO_UPLOAD } from '@/lib/what-to-upload';

const CLOSE_MS = 200;

// Before someone uploads for the first time (and whenever they ask): MAKWIN is for
// artworks, with what does and does not belong, in a few words and one button.
export default function WhatToUploadSheet({ onClose }: { onClose: () => void }) {
  const { language } = useI18n();
  const text = WHAT_TO_UPLOAD[language === 'es' ? 'es' : 'en'];
  const [closing, setClosing] = useState(false);
  const okButton = useRef<HTMLButtonElement>(null);

  useBodyScrollLock(true);

  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  };

  useEffect(() => {
    okButton.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const row = (label: string, yes: boolean) => (
    <li key={label} className="flex items-center gap-3 min-h-7">
      <span
        aria-hidden="true"
        className={yes
          ? 'flex items-center justify-center w-5 h-5 shrink-0 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
          : 'flex items-center justify-center w-5 h-5 shrink-0 rounded-full border border-[hsl(var(--foreground)/0.25)] text-[hsl(var(--muted-foreground))]'}
      >
        {yes ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-3 h-3" strokeWidth={2.5} />}
      </span>
      <span className={yes ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}>{label}</span>
    </li>
  );

  return createPortal(
    <div
      className="rules-sheet-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      data-closing={closing || undefined}
    >
      <div aria-hidden="true" className="soft-backdrop" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="what-to-upload-title"
        className="rules-sheet glass-panel relative w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6"
      >
        <h2 id="what-to-upload-title" className="text-xl font-light tracking-tight text-[hsl(var(--foreground))]">{text.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{text.test}</p>

        <div className="mt-5 flex flex-col gap-4 text-sm">
          <section aria-label={text.yesTitle}>
            <h3 className="mb-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">{text.yesTitle}</h3>
            <ul className="flex flex-col gap-1">{text.yes.map((label) => row(label, true))}</ul>
          </section>
          <section aria-label={text.noTitle}>
            <h3 className="mb-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">{text.noTitle}</h3>
            <ul className="flex flex-col gap-1">{text.no.map((label) => row(label, false))}</ul>
          </section>
        </div>

        <p className="mt-5 flex items-start gap-3 rounded-2xl bg-[hsl(var(--foreground)/0.06)] px-3.5 py-3 text-xs leading-relaxed text-[hsl(var(--foreground))]">
          <Images aria-hidden="true" className="w-4 h-4 shrink-0 mt-px" strokeWidth={1.75} />
          {text.carousel}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
          {text.nuance}{' '}
          {/* In a new tab, so whatever is being uploaded stays exactly as it is. */}
          <a href={RULES_LINK} target="_blank" rel="noopener" className="ios-press inline-flex items-center min-h-11 -my-3.5 text-[hsl(var(--foreground))] underline underline-offset-4 decoration-[hsl(var(--foreground)/0.3)]">
            {text.more}
          </a>
        </p>

        <button ref={okButton} type="button" onClick={close} className="mt-6 w-full glass-button glass-button--primary">
          {text.ok}
        </button>
      </div>
    </div>,
    document.body,
  );
}
