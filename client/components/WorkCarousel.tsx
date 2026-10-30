import { useEffect, useRef, useState, type MouseEvent } from 'react';
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

// Several photos of one work. Scrolling is the browser's own, so swiping feels
// native on a phone; on a computer the arrows do the same.
export default function WorkCarousel({ images, alt, index, onIndexChange, onImageClick, className }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const scroller = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const last = images.length - 1;

  const goTo = (target: number) => {
    const element = scroller.current;
    if (element) element.scrollTo({ left: target * element.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    if (index !== undefined && index !== current) goTo(index);
    // Only a new request from outside moves it: swiping updates `current` itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleScroll = () => {
    const element = scroller.current;
    if (!element || !element.clientWidth) return;
    const visible = Math.min(last, Math.round(element.scrollLeft / element.clientWidth));
    if (visible === current) return;
    setCurrent(visible);
    onIndexChange?.(visible);
  };

  const arrow = 'glass-surface !rounded-full absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-[hsl(var(--foreground))] phone:hidden opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100 transition-opacity duration-200';

  return (
    <div className={cn('group/carousel relative', className)} role="group" aria-roledescription="carousel" aria-label={alt}>
      <div
        ref={scroller}
        onScroll={handleScroll}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' && current < last) goTo(current + 1);
          if (event.key === 'ArrowLeft' && current > 0) goTo(current - 1);
        }}
        className="flex items-center overflow-x-auto snap-x snap-mandatory overscroll-x-contain touch-manipulation outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, slide) => (
          // Slides need some height before their photo loads: without it the row has
          // nothing to scroll, and the browser can land on any photo once they arrive.
          <div key={src} className="w-full shrink-0 min-h-px snap-center flex items-center justify-center">
            <img
              src={src}
              alt={`${alt} (${slide + 1}/${images.length})`}
              draggable={false}
              loading={slide < 2 ? 'eager' : 'lazy'}
              onClick={onImageClick}
              className="select-none rounded-lg max-w-full max-h-[80vh] w-auto h-auto object-contain"
            />
          </div>
        ))}
      </div>

      {last > 0 && (
        <>
          {current > 0 && (
            <button type="button" aria-label={es ? 'Foto anterior' : 'Previous photo'} onClick={() => goTo(current - 1)} className={cn(arrow, 'left-3')}>
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {current < last && (
            <button type="button" aria-label={es ? 'Foto siguiente' : 'Next photo'} onClick={() => goTo(current + 1)} className={cn(arrow, 'right-3')}>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div className="flex justify-center gap-1.5 pt-3" aria-label={`${current + 1}/${images.length}`}>
            {images.map((src, dot) => (
              <span
                key={src}
                className={cn(
                  'h-1.5 w-1.5 rounded-full bg-[hsl(var(--foreground))] transition-opacity duration-300',
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
