import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  /** Said aloud when the label alone is a picture. */
  name?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

// One choice out of a few, with the highlight sliding from the old one to the new one.
export default function Segmented<T extends string>({ options, value, onChange, label, className }: Props<T>) {
  const row = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const chosen = row.current?.querySelector<HTMLElement>('[aria-checked="true"]');
      setPill(chosen ? { left: chosen.offsetLeft, width: chosen.offsetWidth } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (row.current) observer.observe(row.current);
    return () => observer.disconnect();
  }, [value, options.length]);

  // The first time it is simply there; from then on it moves.
  useLayoutEffect(() => {
    if (pill && !ready) requestAnimationFrame(() => setReady(true));
  }, [pill, ready]);

  return (
    <div className={cn('segmented thumb-strip', className)}>
      <div ref={row} role="radiogroup" aria-label={label} className="segmented-row">
        {pill && <span aria-hidden="true" className={cn('segmented-pill', ready && 'segmented-pill--ready')} style={{ width: pill.width, transform: `translateX(${pill.left}px)` }} />}
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            aria-label={option.name}
            onClick={() => onChange(option.value)}
            className="segmented-option"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
