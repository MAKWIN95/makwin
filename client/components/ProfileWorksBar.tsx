import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n/translations';

const TYPE_LABELS: Record<string, TranslationKey> = {
  pintura: 'filter.painting',
  fotografia: 'filter.photography',
  poema: 'filter.poem',
  cancion: 'filter.song',
  video: 'filter.video',
};

interface Props {
  count: number;
  /** The kinds of work there are to choose from. */
  types: string[];
  type: string;
  onTypeChange: (type: string) => void;
  /** Only on your own profile. */
  canShowRemoved: boolean;
  showRemoved: boolean;
  onShowRemovedChange: (show: boolean) => void;
}

// One square with others behind it: this is where the works are.
function StackIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="6.5" width="11" height="11" rx="2.5" />
      <path d="M6.5 3.5h7.5a3 3 0 0 1 3 3v7.5" />
    </svg>
  );
}

// The profile's works and their filter: a small button that stretches to the right,
// like the corner of a work, and shows what you can choose.
export default function ProfileWorksBar({ count, types, type, onTypeChange, canShowRemoved, showRemoved, onShowRemovedChange }: Props) {
  const { t, language } = useI18n();
  const es = language === 'es';
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const hasChoices = types.length > 1 || canShowRemoved;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const works = es ? 'Obras' : 'Works';
  const removed = es ? 'Retiradas' : 'Taken down';
  const active = [showRemoved ? removed : '', type ? t(TYPE_LABELS[type]) : ''].filter(Boolean).join(' · ');
  const chip = 'ios-press whitespace-nowrap shrink-0 h-8 phone:h-9 px-3 rounded-full text-xs font-medium transition-colors duration-200';
  const chipOn = 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]';
  const chipOff = 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]';

  return (
    <div ref={root} className="profile-works-bar" data-open={open || undefined}>
      <button
        type="button"
        aria-expanded={hasChoices ? open : undefined}
        aria-label={es ? `Obras: ${count}. Filtrar` : `Works: ${count}. Filter`}
        disabled={!hasChoices}
        onClick={() => setOpen((value) => !value)}
        className="ios-press shrink-0 h-10 phone:h-11 pl-3 pr-2 inline-flex items-center gap-2 rounded-full text-sm font-medium text-[hsl(var(--foreground))] disabled:pr-3.5 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
      >
        <StackIcon />
        <span className="profile-works-title whitespace-nowrap">
          {active || works}
          <span className="ml-1.5 font-normal text-[hsl(var(--muted-foreground))]">{count}</span>
        </span>
        {hasChoices && <ChevronRight className="profile-works-chevron w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
      </button>

      {hasChoices && (
        <div className="profile-works-fold" aria-hidden={!open} {...(open ? {} : { inert: '' })}>
          <div className="min-w-0 flex items-center gap-1 pr-1.5">
            <div className="thumb-strip profile-works-kinds min-w-0 flex items-center gap-0.5 overflow-x-auto" role="group" aria-label={es ? 'Tipo de obra' : 'Type of work'}>
              {types.length > 1 && (
                <>
                  <button type="button" aria-pressed={!type} onClick={() => onTypeChange('')} className={`${chip} ${!type ? chipOn : chipOff}`}>
                    {es ? 'Todas' : 'All'}
                  </button>
                  {types.map((value) => (
                    <button key={value} type="button" aria-pressed={type === value} onClick={() => onTypeChange(value)} className={`${chip} ${type === value ? chipOn : chipOff}`}>
                      {t(TYPE_LABELS[value])}
                    </button>
                  ))}
                </>
              )}
            </div>
            {canShowRemoved && (
              <button
                type="button"
                role="checkbox"
                aria-checked={showRemoved}
                onClick={() => onShowRemovedChange(!showRemoved)}
                className={`ios-press shrink-0 h-8 phone:h-9 px-2 inline-flex items-center gap-1.5 rounded-full text-xs font-medium whitespace-nowrap ${types.length > 1 ? 'ml-1 border-l border-[hsl(var(--foreground)/0.14)] rounded-l-none' : ''} ${showRemoved ? 'text-[hsl(var(--foreground))]' : chipOff}`}
              >
                <span className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-colors duration-200 ${showRemoved ? 'bg-[hsl(var(--foreground))] border-[hsl(var(--foreground))] text-[hsl(var(--background))]' : 'border-[hsl(var(--foreground)/0.35)]'}`}>
                  {showRemoved && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className="phone:hidden">{es ? 'Mostrar retiradas' : 'Show taken down'}</span>
                <span className="hidden phone:inline">{removed}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
