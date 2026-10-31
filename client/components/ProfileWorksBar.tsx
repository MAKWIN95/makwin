import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface WorksChoice {
  value: string;
  label: string;
  count: number;
}

interface Props {
  choices: WorksChoice[];
  value: string;
  onChange: (value: string) => void;
}

// How far a finger travels to go from one word to the next.
const STEP_PX = 64;
const RING_RADIUS_PX = 34;
const SETTLE_MS = 80;
const QUICK_FLICK = 0.35;
const TAP_PX = 8;

const wrap = (index: number, size: number) => ((index % size) + size) % size;

// One square with others behind it: this is where the works are.
function StackIcon() {
  return (
    <svg viewBox="0 0 20 20" className="block w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="6.5" width="11" height="11" rx="2.5" />
      <path d="M6.5 3.5h7.5a3 3 0 0 1 3 3v7.5" />
    </svg>
  );
}

// The words sit on a ring seen from the front: one faces you, and sliding sends it
// round to the back as the next one comes round from the other side.
function WordRing({ choices, value, onChange, open }: Props & { open: boolean }) {
  const { language } = useI18n();
  const ring = useRef<HTMLDivElement>(null);
  const size = choices.length;
  const index = Math.max(0, choices.findIndex((choice) => choice.value === value));
  const place = useRef(index);
  const target = useRef(index);
  const frame = useRef(0);
  const press = useRef<{ x: number; place: number; lastX: number; lastAt: number; speed: number; moved: boolean } | null>(null);
  const latest = useRef({ choices, onChange });
  latest.current = { choices, onChange };

  const draw = () => {
    const element = ring.current;
    if (!element) return;
    element.querySelectorAll<HTMLElement>('[data-word]').forEach((word, slot) => {
      let away = wrap(slot - place.current, size);
      if (away > size / 2) away -= size;
      const angle = Math.max(-1, Math.min(1, away)) * (Math.PI / 2);
      const facing = Math.cos(angle);
      word.style.transform = `translate(calc(-50% + ${Math.sin(angle) * RING_RADIUS_PX}px), -50%) scale(${0.6 + 0.4 * facing})`;
      word.style.opacity = String(facing * facing * facing);
    });
    const front = wrap(Math.round(place.current), size);
    element.querySelectorAll<HTMLElement>('[data-dot]').forEach((dot, slot) => {
      dot.style.opacity = slot === front ? '0.9' : '0.25';
    });
  };

  const settle = () => {
    cancelAnimationFrame(frame.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      place.current = target.current;
      draw();
      return;
    }
    let before = performance.now();
    const step = (now: number) => {
      const gap = target.current - place.current;
      place.current += gap * (1 - Math.exp(-Math.max(0, now - before) / SETTLE_MS));
      before = now;
      if (Math.abs(target.current - place.current) < 0.002) place.current = target.current;
      draw();
      if (place.current !== target.current) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  const goTo = (next: number) => {
    target.current = next;
    settle();
    const chosen = latest.current.choices[wrap(next, size)];
    if (chosen) latest.current.onChange(chosen.value);
  };

  // Another way of arriving at a choice (going back, say) takes the short way round.
  useLayoutEffect(() => {
    if (press.current) return;
    if (wrap(target.current, size) === index) {
      draw();
      return;
    }
    let away = wrap(index - target.current, size);
    if (away > size / 2) away -= size;
    target.current += away;
    settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, size]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // A trackpad slides it too.
  useEffect(() => {
    const element = ring.current;
    if (!element) return;
    let travelled = 0;
    let restUntil = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (performance.now() < restUntil) return;
      travelled += event.deltaX;
      if (Math.abs(travelled) < 30) return;
      goTo(target.current + Math.sign(travelled));
      travelled = 0;
      restUntil = performance.now() + 320;
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <div
      ref={ring}
      role="slider"
      tabIndex={open ? 0 : -1}
      aria-label={language === 'es' ? 'Filtrar obras' : 'Filter works'}
      aria-valuemin={0}
      aria-valuemax={size - 1}
      aria-valuenow={index}
      aria-valuetext={choices[index]?.label}
      className="profile-works-ring"
      onPointerDown={(event) => {
        cancelAnimationFrame(frame.current);
        press.current = { x: event.clientX, place: place.current, lastX: event.clientX, lastAt: event.timeStamp, speed: 0, moved: false };
      }}
      onPointerMove={(event) => {
        const held = press.current;
        if (!held) return;
        const dx = event.clientX - held.x;
        if (!held.moved) {
          if (Math.abs(dx) < TAP_PX) return;
          held.moved = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        held.speed = (held.lastX - event.clientX) / Math.max(1, event.timeStamp - held.lastAt);
        held.lastX = event.clientX;
        held.lastAt = event.timeStamp;
        place.current = held.place - dx / STEP_PX;
        draw();
      }}
      onPointerUp={() => {
        const held = press.current;
        press.current = null;
        if (!held) return;
        if (!held.moved) {
          goTo(target.current + 1);
          return;
        }
        const nearest = Math.round(place.current);
        const flicked = Math.abs(held.speed) > QUICK_FLICK && nearest === Math.round(held.place);
        goTo(flicked ? nearest + Math.sign(held.speed) : nearest);
      }}
      onPointerCancel={() => {
        press.current = null;
        settle();
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') goTo(target.current + 1);
        if (event.key === 'ArrowLeft') goTo(target.current - 1);
      }}
    >
      {choices.map((choice) => (
        <span key={choice.value} data-word className="profile-works-word">{choice.label}</span>
      ))}
      <span className="profile-works-dots" aria-hidden="true">
        {choices.map((choice) => <span key={choice.value} data-dot />)}
      </span>
    </div>
  );
}

// The profile's works and their filter: a small button that stretches to the right,
// like the corner of a work, with one word to slide through what there is.
export default function ProfileWorksBar({ choices, value, onChange }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  const hasChoices = choices.length > 1;
  const chosen = choices.find((choice) => choice.value === value) ?? choices[0];

  // The room in the middle goes from the size of the name to the size of the ring.
  useLayoutEffect(() => {
    const fit = () => {
      if (!slot.current || !title.current) return;
      slot.current.style.width = open ? '' : `${title.current.offsetWidth}px`;
    };
    fit();
    const watcher = new ResizeObserver(fit);
    if (title.current) watcher.observe(title.current);
    return () => watcher.disconnect();
  }, [open]);

  // A slide of the page is not a tap outside: only a real tap, or Escape, closes it.
  useEffect(() => {
    if (!open) return;
    let pressed: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      pressed = root.current?.contains(event.target as Node) ? null : { x: event.clientX, y: event.clientY };
    };
    const onCancel = () => {
      pressed = null;
    };
    const onUp = (event: PointerEvent) => {
      if (pressed && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < TAP_PX) setOpen(false);
      pressed = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const name = !chosen || !chosen.value ? (es ? 'Obras' : 'Works') : chosen.label;

  return (
    <div ref={root} className="profile-works-bar" data-open={open || undefined}>
      {hasChoices && (
        <button
          type="button"
          aria-expanded={open}
          aria-label={es ? `${name}: ${chosen?.count ?? 0}. Filtrar` : `${name}: ${chosen?.count ?? 0}. Filter`}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="profile-works-toggle"
        />
      )}
      <span className="profile-works-part"><StackIcon /></span>
      <div ref={slot} className="profile-works-slot">
        <span ref={title} className="profile-works-title">
          {name}
          <span className="ml-1.5 font-normal text-[hsl(var(--muted-foreground))]">{chosen?.count ?? 0}</span>
        </span>
        {hasChoices && (
          <div className="profile-works-room" {...(open ? {} : { inert: '' })}>
            <WordRing choices={choices} value={value} onChange={onChange} open={open} />
          </div>
        )}
      </div>
      {hasChoices && (
        <span className="profile-works-part profile-works-chevron">
          <ChevronRight className="block w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </span>
      )}
    </div>
  );
}
