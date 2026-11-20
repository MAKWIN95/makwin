import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { cn } from '@/lib/utils';

const CLOSE_MS = 200;

interface Props {
  title: string;
  /** One line under the title. */
  lead?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Wider windows for grids of works. */
  wide?: boolean;
}

// The portfolio's windows: the same glass as the rest of MAKWIN, with the page behind
// soft and dark beside it (never around it, so the glass blurs the page itself).
export default function PortfolioSheet({ title, lead, closeLabel, onClose, children, wide = false }: Props) {
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useBodyScrollLock(true);

  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  };

  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <div className="rules-sheet-overlay pf-sheet-overlay fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4" data-closing={closing || undefined}>
      <div aria-hidden="true" className="soft-backdrop" onClick={close} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'rules-sheet glass-panel relative w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain p-5 sm:p-6 outline-none',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-light tracking-tight text-[hsl(var(--foreground))]">{title}</h2>
            {lead && <p className="mt-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{lead}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            className="ios-press tap-area -mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--foreground)/0.08)] text-[hsl(var(--muted-foreground))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{typeof children === 'function' ? children(close) : children}</div>
      </div>
    </div>,
    document.body,
  );
}
