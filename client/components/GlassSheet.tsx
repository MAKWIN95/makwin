import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useI18n } from '@/lib/i18n';

const CLOSE_MS = 260;

// A window of glass (v1.1.39): on a phone it rises from the bottom like the iPhone's sheets,
// on a computer it appears in the middle. The page behind goes dark and soft beside it
// (never around it, so the glass can blur the page). Esc, the X or a tap outside close it,
// always with its own animation; `children` gets that same close to call when done.
export default function GlassSheet({ title, onClose, children, wide = false, footer }: {
  title: string;
  onClose: () => void;
  children: (close: () => void) => React.ReactNode;
  wide?: boolean;
  footer?: (close: () => void) => React.ReactNode;
}) {
  const { language } = useI18n();
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const panel = useRef<HTMLDivElement | null>(null);
  useBodyScrollLock(true);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, button:not([data-sheet-x])');
      first?.focus({ preventScroll: true });
    }, 80);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      before?.focus?.({ preventScroll: true });
    };
  }, [close]);

  return createPortal(
    <div className="glass-sheet-overlay" data-closing={closing || undefined}>
      <div aria-hidden="true" className="soft-backdrop" onClick={close} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className={`glass-sheet glass-panel ${wide ? 'glass-sheet--wide' : ''}`}>
        <span className="glass-sheet-grip" aria-hidden="true" />
        <div className="glass-sheet-head">
          <h2>{title}</h2>
          <button type="button" data-sheet-x onClick={close} className="glass-sheet-x ios-press" aria-label={language === 'es' ? 'Cerrar' : 'Close'}>
            <X />
          </button>
        </div>
        <div className="glass-sheet-body">{children(close)}</div>
        {footer && <div className="glass-sheet-foot">{footer(close)}</div>}
      </div>
    </div>,
    document.body,
  );
}
