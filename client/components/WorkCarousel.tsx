import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Props {
  images: string[];
  alt: string;
  /** Slide to show when something outside chooses one, such as a thumbnail. */
  index?: number;
  onIndexChange?: (index: number) => void;
  onImageClick?: (event: MouseEvent) => void;
  className?: string;
}

const DRAG_START_PX = 8;
const SWIPE_SHARE = 0.16;

// Each photo sits behind the next, and the deck has no end.
const RESTING = [
  { transform: 'none', z: 20, opacity: 1 },
  { transform: 'translateY(10px) scale(0.95)', z: 10, opacity: 0.7 },
  { transform: 'translateY(20px) scale(0.9)', z: 5, opacity: 0.35 },
];
const HIDDEN = { transform: 'translateY(20px) scale(0.9)', z: 0, opacity: 0 };

type Flight = { slide: number; kind: 'back' | 'front'; from: string };

// Several photos of one work, passed like a deck of cards: the one on top goes
// to the back, and the last one of the deck is followed by the first again.
export default function WorkCarousel({ images, alt, index, onIndexChange, onImageClick, className }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const count = images.length;
  const [requested, setRequested] = useState(0);
  const [flight, setFlight] = useState<Flight | null>(null);
  const current = Math.min(requested, count - 1);
  const topCard = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; dx: number; id: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  const show = (target: number, kind: 'back' | 'front', from = 'none', notify = true) => {
    if (target === current || count < 2) return;
    setFlight({ slide: kind === 'back' ? current : target, kind, from });
    setRequested(target);
    if (notify) onIndexChange?.(target);
  };
  const next = (from?: string) => show((current + 1) % count, 'back', from);
  const previous = () => show((current - 1 + count) % count, 'front');

  useEffect(() => {
    if (index === undefined || index === current) return;
    show(index, index > current ? 'back' : 'front', 'none', false);
    // Only a new request from outside moves it: passing a card updates `current` itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const dragStyle = (dx: number) => `translateX(${dx}px) rotate(${dx * 0.015}deg)`;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (count < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    drag.current = { x: event.clientX, y: event.clientY, dx: 0, id: event.pointerId, moved: false };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    if (!active.moved) {
      if (Math.abs(dx) < DRAG_START_PX) return;
      if (Math.abs(event.clientY - active.y) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      active.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      topCard.current?.setAttribute('data-dragging', '');
    }
    active.dx = dx;
    topCard.current?.style.setProperty('--deck-rest', dragStyle(dx));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const active = drag.current;
    drag.current = null;
    if (!active?.moved || active.id !== event.pointerId) return;
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
    const card = topCard.current;
    card?.removeAttribute('data-dragging');
    card?.style.setProperty('--deck-rest', 'none');
    const width = card?.offsetWidth ?? 300;
    if (cancelled || Math.abs(active.dx) < width * SWIPE_SHARE) return;
    if (active.dx < 0) next(dragStyle(active.dx));
    else previous();
  };

  const arrow = 'hover-animate glass-surface !rounded-full absolute top-1/2 -translate-y-1/2 z-40 w-10 h-10 flex items-center justify-center text-[hsl(var(--foreground))] phone:hidden opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition-opacity duration-200';

  return (
    <div
      className={cn('group/carousel relative phone:-mx-4 phone:px-4 phone:overflow-x-clip', className)}
      role="group"
      aria-roledescription="carousel"
      aria-label={alt}
    >
      <div
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => handlePointerEnd(event)}
        onPointerCancel={(event) => handlePointerEnd(event, true)}
        onClickCapture={(event) => {
          if (swallowClick.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') next();
          if (event.key === 'ArrowLeft') previous();
        }}
        className={cn('deck relative outline-none touch-pan-y select-none', count > 1 && 'pb-6')}
      >
        {images.map((src, slide) => {
          const position = (slide - current + count) % count;
          const rest = RESTING[position] ?? HIDDEN;
          const flying = flight?.slide === slide ? flight : null;
          return (
            <div
              key={src}
              ref={position === 0 ? topCard : undefined}
              data-position={position}
              data-flight={flying?.kind}
              onAnimationEnd={() => setFlight((now) => (now?.slide === slide ? null : now))}
              style={{
                '--deck-rest': rest.transform,
                '--deck-from': flying?.from ?? 'none',
                '--deck-z': rest.z,
                '--deck-opacity': rest.opacity,
              } as CSSProperties}
              className={cn('deck-card', position !== 0 && 'pointer-events-none')}
            >
              <img
                src={src}
                alt={position === 0 ? `${alt} (${slide + 1}/${count})` : ''}
                aria-hidden={position !== 0}
                draggable={false}
                onClick={onImageClick}
                className="select-none rounded-lg max-w-full max-h-[80vh] w-auto h-auto object-contain"
              />
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button type="button" aria-label={es ? 'Foto anterior' : 'Previous photo'} onClick={() => previous()} className={cn(arrow, 'left-3')}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" aria-label={es ? 'Foto siguiente' : 'Next photo'} onClick={() => next()} className={cn(arrow, 'right-3')}>
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex justify-center gap-1.5 pt-1" aria-label={`${current + 1}/${count}`}>
            {images.map((src, dot) => (
              <i
                key={src}
                className={cn(
                  'deck-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--foreground))]',
                  dot === current ? 'opacity-90' : 'opacity-25',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
