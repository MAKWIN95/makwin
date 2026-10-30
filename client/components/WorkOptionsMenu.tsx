import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface WorkOption {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
}

interface Props {
  label: string;
  options: WorkOption[];
  /** Over an image the corner is pale paper; over plain cards it is a soft grey. */
  onArtwork?: boolean;
}

const CLOSE_MS = 200;

// A folded corner on the work. It unfolds to the left into a line along the top
// of the work, and any tap elsewhere only closes it.
export default function WorkOptionsMenu({ label, options, onArtwork = true }: Props) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  };

  const hide = () => {
    setOpen(false);
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setClosing(false), CLOSE_MS);
  };

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (root.current?.contains(target)) return;
      hide();
      // Another card's corner opens straight away; anything else must not also be
      // activated by the tap that closed this line.
      if (target.closest?.('[data-work-options]')) return;
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
      };
      document.addEventListener('click', swallow, { capture: true, once: true });
      // A scroll never produces that click, so it cannot stay waiting for the next tap.
      const release = () => setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 350);
      document.addEventListener('pointerup', release, { once: true });
      document.addEventListener('pointercancel', release, { once: true });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} data-work-options className="absolute inset-x-0 top-0 z-30 h-10 pointer-events-none">
      {(open || closing) && (
        <div className="work-options absolute inset-x-1 top-1 h-8" data-count={options.length}>
          <div className="work-options-bar absolute inset-y-0 right-0 pointer-events-auto" data-closing={closing || undefined}>
            <div role="menu" aria-label={label} className="work-options-row absolute inset-y-0 right-0 flex items-stretch gap-0.5 p-0.5 pr-8">
              {options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="menuitem"
                  aria-label={option.label}
                  onClick={() => {
                    hide();
                    option.onSelect();
                  }}
                  className="work-options-item flex-1 min-w-0 flex items-center justify-center rounded-full text-xs font-medium text-white whitespace-nowrap outline-none"
                >
                  <span className="work-options-label">{option.label}</span>
                  <span className="work-options-icon">{option.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-plain={onArtwork ? undefined : ''}
        onClick={() => (open ? hide() : show())}
        className="work-fold tap-area absolute top-0 right-0 w-10 h-10 pointer-events-auto outline-none"
      >
        <svg className="work-fold-shape" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M-1.2 1.2L16.8 19.2H2.3Q-1.2 19.2-1.2 15.7Z" fill="rgba(0,0,0,0.16)" />
          <path d="M0 0L18 18H3.5Q0 18 0 14.5Z" fill="var(--fold-paper)" />
        </svg>
        <X className="work-fold-close" strokeWidth={2.25} />
      </button>
    </div>
  );
}
