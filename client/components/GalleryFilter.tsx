import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';

const TYPES = [
  ['', 'filter.allTypes'],
  ['pintura', 'filter.painting'],
  ['fotografia', 'filter.photography'],
  ['poema', 'filter.poem'],
  ['cancion', 'filter.song'],
  ['video', 'filter.video'],
] as const;

// Lives inside the floating header. The filter button unfolds a single dropdown:
// into the free space on its right on wide screens, over the search box elsewhere.
export default function GalleryFilter({ onExpand }: { onExpand: (expanded: boolean) => void }) {
  const { t, language } = useI18n();
  const es = language === 'es';
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const active = new URLSearchParams(location.search).get('tipo') ?? '';
  const activeType = TYPES.find(([value]) => value === active) ?? TYPES[0];

  const expand = (value: boolean) => {
    setExpanded(value);
    onExpand(value);
  };

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element;
      // The options are drawn outside the header, on top of everything.
      if (root.current?.contains(target) || target.closest?.('[role=menu]')) return;
      expand(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !menuOpen) expand(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded, menuOpen]);

  const choose = (value: string) => {
    const params = new URLSearchParams(location.search);
    if (value) params.set('tipo', value);
    else params.delete('tipo');
    navigate({ search: params.toString() }, { replace: true });
    expand(false);
  };

  return (
    <div ref={root} className="contents">
      <button
        id="filter-btn"
        type="button"
        aria-label={es ? 'Filtrar' : 'Filter'}
        aria-expanded={expanded}
        onClick={() => expand(!expanded)}
        className={`header-button relative ml-2 w-10 phone:w-11 shrink-0 self-stretch inline-flex items-center justify-center border border-[rgba(120,120,120,0.25)] ${expanded ? 'header-button--on' : ''}`}
      >
        <Filter size={16} className={active ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'} />
        {active && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[hsl(var(--foreground))]" />}
      </button>

      {expanded && (
        <div className="filter-slot absolute inset-y-0 left-0 right-12 phone:right-[3.25rem] xl:left-full xl:right-auto xl:ml-2 xl:w-[9.25rem] z-10">
          <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={es ? 'Tipo de obra' : 'Type of work'}
                className="header-button w-full h-full flex items-center justify-between gap-1 px-2.5 text-sm text-[hsl(var(--foreground))] border border-[rgba(120,120,120,0.25)] outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))]"
              >
                <span className="truncate">{t(activeType[1])}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              onCloseAutoFocus={(event) => event.preventDefault()}
              className="glass-menu p-1.5 min-w-[var(--radix-dropdown-menu-trigger-width)]"
            >
              {TYPES.map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onSelect={() => choose(value)}
                  className="phone:min-h-11 rounded-lg px-3 py-2 gap-3 cursor-pointer text-[hsl(var(--foreground))] focus:bg-[hsl(var(--foreground)/0.08)] focus:text-[hsl(var(--foreground))]"
                >
                  {t(label)}
                  <span className="ml-auto">{value === active ? <Check className="w-4 h-4" /> : null}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
