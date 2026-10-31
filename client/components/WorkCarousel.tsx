import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { animate, motion, motionValue, useReducedMotion, type MotionValue } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { fitArtwork } from '@/lib/fit-artwork';

interface Props {
  images: string[];
  alt: string;
  onImageClick?: (event: MouseEvent) => void;
  className?: string;
}

interface Card {
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  rotate: MotionValue<number>;
  opacity: MotionValue<number>;
  z: MotionValue<number>;
}

const DRAG_START_PX = 6;
const SWIPE_SHARE = 0.15;
const FLICK_SPEED = 320;
const FLY_SHARE = 0.68;
const TUCK_MS = 110;
const SPRING = { type: 'spring', stiffness: 560, damping: 44, mass: 0.7 } as const;
const OUT = { type: 'spring', stiffness: 700, damping: 48, mass: 0.6 } as const;
// Dragging back: this share of the way, the previous photo is still coming out from behind.
const COMES_OUT_SHARE = 0.2;
const COMES_OUT_MS = 150;
const CLEAR_GAP = 8;
const OUT_TILT = 5;

// Each photo sits behind the next, and the deck has no end.
const RESTING = [
  { y: 0, scale: 1, opacity: 1, z: 20 },
  { y: 8, scale: 0.955, opacity: 0.75, z: 10 },
  { y: 16, scale: 0.91, opacity: 0.4, z: 5 },
];
const HIDDEN = { y: 16, scale: 0.91, opacity: 0, z: 0 };

const between = (from: number, to: number, share: number) => from + (to - from) * share;

// Several photos of one work, passed like a deck of cards. Under the finger the
// card goes exactly where the finger goes, and the springs start from whatever
// speed it had when it was let go, so nothing ever jumps.
export default function WorkCarousel({ images, alt, onImageClick, className }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const reduced = useReducedMotion();
  const count = images.length;
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);
  const deck = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; from: number; id: number; moved: boolean; at: number; lastX: number; speed: number; back: boolean; landing: boolean } | null>(null);
  const swallowClick = useRef(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const cards = useRef(new Map<string, Card>());

  const positionOf = (slide: number, top: number) => (slide - top + count) % count;
  const restAt = (position: number) => RESTING[position] ?? HIDDEN;

  const cardFor = (src: string, slide: number): Card => {
    let card = cards.current.get(src);
    if (!card) {
      const rest = restAt(positionOf(slide, 0));
      card = {
        x: motionValue(0),
        y: motionValue(rest.y),
        scale: motionValue(rest.scale),
        rotate: motionValue(0),
        opacity: motionValue(rest.opacity),
        z: motionValue(rest.z),
      };
      cards.current.set(src, card);
    }
    return card;
  };

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const spring = (value: MotionValue<number>, target: number, velocity?: number, transition: typeof SPRING | typeof OUT = SPRING) => {
    if (reduced) value.set(target);
    else animate(value, target, { ...transition, ...(velocity === undefined ? {} : { velocity }) });
  };

  const settle = (src: string, position: number, velocity?: number) => {
    const card = cards.current.get(src);
    if (!card) return;
    const rest = restAt(position);
    clearTimeout(timers.current.get(src));
    card.z.set(rest.z);
    spring(card.x, 0, velocity);
    spring(card.rotate, 0);
    spring(card.y, rest.y);
    spring(card.scale, rest.scale);
    spring(card.opacity, rest.opacity);
  };

  const flyWidth = () => (deck.current?.offsetWidth ?? 320) * FLY_SHARE;

  // How far a photo must be to the left of the top one for the two not to touch,
  // so it can change from behind to in front without anything showing the change.
  const clearOfTop = (slide: number, topSlide: number) => {
    const widthOf = (index: number) => deck.current?.children[index]?.querySelector('img')?.offsetWidth ?? flyWidth();
    return (widthOf(slide) + widthOf(topSlide)) / 2 + CLEAR_GAP;
  };

  const moveTo = (target: number, special: string) => {
    currentRef.current = target;
    setCurrent(target);
    images.forEach((src, slide) => {
      if (src !== special) settle(src, positionOf(slide, target));
    });
  };

  // The top card flies out on its side, slips behind the others and goes to the back.
  const next = (side = -1, velocity = 0) => {
    if (count < 2) return;
    const top = currentRef.current;
    const target = (top + 1) % count;
    const src = images[top];
    const card = cards.current.get(src);
    if (!card || reduced) return moveTo(target, '');
    moveTo(target, src);
    clearTimeout(timers.current.get(src));
    card.z.set(30);
    spring(card.x, side * flyWidth(), velocity, OUT);
    spring(card.rotate, side * OUT_TILT, undefined, OUT);
    timers.current.set(src, setTimeout(() => settle(src, positionOf(images.indexOf(src), currentRef.current)), TUCK_MS));
  };

  // The way back is the same path backwards: the card that left to the left and
  // behind comes out from behind on the left and lands on top. The right is never used.
  const previous = () => {
    if (count < 2) return;
    const leaving = currentRef.current;
    const target = (leaving - 1 + count) % count;
    const src = images[target];
    const card = cards.current.get(src);
    if (!card || reduced) return moveTo(target, '');
    moveTo(target, src);
    clearTimeout(timers.current.get(src));
    card.z.set(1);
    spring(card.opacity, 1);
    spring(card.scale, 0.96);
    spring(card.y, 0);
    spring(card.x, -clearOfTop(target, leaving), undefined, OUT);
    spring(card.rotate, -OUT_TILT, undefined, OUT);
    timers.current.set(src, setTimeout(() => settle(src, positionOf(images.indexOf(src), currentRef.current)), COMES_OUT_MS));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (count < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const top = cards.current.get(images[currentRef.current]);
    drag.current = { x: event.clientX, y: event.clientY, from: top?.x.get() ?? 0, id: event.pointerId, moved: false, at: event.timeStamp, lastX: top?.x.get() ?? 0, speed: 0, back: false, landing: false };
  };

  // First the previous photo comes out from behind towards the left, then it follows
  // the finger back over the deck while the others make room.
  const dragBack = (active: NonNullable<typeof drag.current>, topSlide: number, x: number) => {
    active.back = true;
    const share = Math.min(1, x / flyWidth());
    const out = Math.min(1, share / COMES_OUT_SHARE);
    const land = Math.max(0, (share - COMES_OUT_SHARE) / (1 - COMES_OUT_SHARE));
    active.landing = land > 0;
    images.forEach((src, slide) => {
      const card = cards.current.get(src);
      if (!card) return;
      const position = positionOf(slide, topSlide);
      card.y.stop();
      card.scale.stop();
      card.opacity.stop();
      if (position === count - 1) {
        const from = restAt(position);
        const side = land > 0 ? 1 - land : out;
        card.x.stop();
        card.rotate.stop();
        card.x.set(-clearOfTop(slide, topSlide) * side);
        card.rotate.set(-OUT_TILT * side);
        card.z.set(land > 0 ? 30 : 1);
        card.y.set(between(from.y, 0, out));
        card.opacity.set(between(from.opacity, 1, out));
        card.scale.set(land > 0 ? between(0.96, 1, land) : between(from.scale, 0.96, out));
        return;
      }
      const from = restAt(position);
      const to = restAt(position + 1);
      card.y.set(between(from.y, to.y, land));
      card.scale.set(between(from.scale, to.scale, land));
      card.opacity.set(between(from.opacity, to.opacity, land));
    });
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
    }
    const topSlide = currentRef.current;
    const top = cards.current.get(images[topSlide]);
    if (!top) return;
    const x = active.from + dx;
    const elapsed = event.timeStamp - active.at;
    if (elapsed > 0) active.speed = ((x - active.lastX) / elapsed) * 1000;
    active.at = event.timeStamp;
    active.lastX = x;
    top.x.stop();
    top.rotate.stop();

    // To the right the top photo stays where it is: it is the previous one that moves.
    if (x > 0) {
      top.x.set(0);
      top.rotate.set(0);
      dragBack(active, topSlide, x);
      return;
    }
    if (active.back) {
      active.back = false;
      active.landing = false;
      const passed = cards.current.get(images[(topSlide - 1 + count) % count]);
      passed?.x.set(0);
      passed?.rotate.set(0);
      images.forEach((src, slide) => cards.current.get(src)?.z.set(restAt(positionOf(slide, topSlide)).z));
    }
    top.x.set(x);
    top.rotate.set(x * 0.018);

    // The rest of the deck comes forward as the card leaves.
    const share = x < 0 ? Math.min(1, -x / flyWidth()) : 0;
    images.forEach((src, slide) => {
      const position = positionOf(slide, topSlide);
      if (position === 0) return;
      const card = cards.current.get(src);
      if (!card) return;
      const from = restAt(position);
      const to = restAt(position - 1);
      card.y.stop();
      card.scale.stop();
      card.opacity.stop();
      card.y.set(between(from.y, to.y, share));
      card.scale.set(between(from.scale, to.scale, share));
      card.opacity.set(between(from.opacity, to.opacity, share));
    });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const active = drag.current;
    drag.current = null;
    if (!active?.moved || active.id !== event.pointerId) return;
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
    const topSlide = currentRef.current;
    const top = cards.current.get(images[topSlide]);
    if (!top) return;
    const x = top.x.get();
    const speed = top.x.getVelocity();
    const width = deck.current?.offsetWidth ?? 320;
    if (active.back) {
      const back = !cancelled && (active.lastX > width * SWIPE_SHARE || active.speed > FLICK_SPEED);
      if (!back) return images.forEach((src, slide) => settle(src, positionOf(slide, topSlide)));
      // Already over the deck it simply lands; still behind, it finishes coming out first.
      if (active.landing) return moveTo((topSlide - 1 + count) % count, '');
      return previous();
    }
    const goes = !cancelled && (Math.abs(x) > width * SWIPE_SHARE || Math.abs(speed) > FLICK_SPEED);
    if (goes && (x < 0 || speed < -FLICK_SPEED) && speed < FLICK_SPEED) return next(-1, speed);
    if (goes && (x > 0 || speed > FLICK_SPEED) && speed > -FLICK_SPEED) return previous();
    images.forEach((src, slide) => settle(src, positionOf(slide, topSlide), slide === topSlide ? speed : undefined));
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
        ref={deck}
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
        className={cn('deck relative outline-none touch-pan-y select-none cursor-grab active:cursor-grabbing', count > 1 && 'pb-5')}
      >
        {images.map((src, slide) => {
          const position = positionOf(slide, current);
          const card = cardFor(src, slide);
          return (
            <motion.div
              key={src}
              data-position={position}
              style={{ x: card.x, y: card.y, scale: card.scale, rotate: card.rotate, opacity: card.opacity, zIndex: card.z }}
              className={cn('deck-card', position !== 0 && 'pointer-events-none')}
            >
              <img
                ref={fitArtwork}
                src={src}
                alt={position === 0 ? `${alt} (${slide + 1}/${count})` : ''}
                aria-hidden={position !== 0}
                draggable={false}
                decoding={slide === 0 ? 'sync' : 'async'}
                onClick={onImageClick}
                className="select-none rounded-lg max-w-full max-h-[80vh] w-auto h-auto object-contain"
              />
            </motion.div>
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
