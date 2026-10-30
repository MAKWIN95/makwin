import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkOption {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
}

interface Props {
  label: string;
  options: WorkOption[];
  className?: string;
}

const CLOSE_MS = 200;

// The three dots over a work. They unfold to the left into a line along the top
// of the work, and any tap elsewhere only closes it.
export default function WorkOptionsMenu({ label, options, className }: Props) {
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
      // Another card's dots open straight away; anything else must not also be
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
    <div ref={root} data-work-options className="absolute inset-x-1 top-1 z-30 h-8 pointer-events-none">
      {(open || closing) && (
        <div className="work-options absolute inset-0" data-count={options.length}>
          <div className="work-options-bar absolute inset-y-0 right-0 pointer-events-auto" data-closing={closing || undefined}>
            <div role="menu" aria-label={label} className="work-options-row absolute inset-y-0 right-0 flex items-stretch pr-8">
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
                  className="ios-press flex-1 min-w-0 flex items-center justify-center text-xs font-medium text-white whitespace-nowrap outline-none focus-visible:underline"
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
        onClick={() => (open ? hide() : show())}
        className={cn(
          'tap-area ios-press absolute top-0 right-0 w-8 h-8 pointer-events-auto flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          className,
          open && 'text-white',
        )}
      >
        <MoreVertical className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
