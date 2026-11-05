import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { tick } from '@/lib/haptics';
import { cn } from '@/lib/utils';

export interface UploadMedia {
  id: string;
  file: File;
  url: string;
  /** Photos only. */
  width?: number;
  height?: number;
}

type Thumb = Pick<UploadMedia, 'id' | 'url' | 'width' | 'height'>;

interface Props {
  photos: Thumb[];
  selected: number;
  max: number;
  onSelect: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

// A finger has to rest this long on a photo to pick it up; moving sooner is just scrolling.
const LIFT_AFTER_MS = 260;
const STILL_PX = 8;
const MOUSE_DRAG_PX = 4;
const GAP = 8;
// The neighbours part this much around the line where the photo will land.
const PART = 7;
// Near the edges the row scrolls by itself, faster the closer the finger gets.
const EDGE_PX = 48;
const EDGE_SPEED = 10;
const SETTLE = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)';
const LEAVE_MS = 220;

const shapeOf = (ratio: number) => Math.min(1.5, Math.max(0.6, ratio));

interface Slot { left: number; width: number }
interface Drag {
  id: string;
  from: number;
  slots: Slot[];
  startX: number;
  startScroll: number;
  x: number;
  to: number;
}

// The order of the carousel. Hold a photo and it comes out of the row: it follows the finger
// sideways, the others close up behind it, and a line shows where it will land.
export default function UploadThumbs({ photos, selected, max, onSelect, onMove, onRemove, onAdd }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const strip = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const press = useRef<{ id: string; x: number; y: number; timer?: number; mouse: boolean } | null>(null);
  const lastX = useRef(0);
  const swallowClick = useRef(false);
  const settleFrom = useRef<Map<string, number> | null>(null);
  const lastLine = useRef(0);

  const ratioOf = (photo: Thumb) => (photo.width && photo.height ? photo.width / photo.height : ratios[photo.id] ?? 1);
  const canDrag = photos.length > 1;

  const setBoth = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  // Where everything is drawn right now, so a new order can slide in from there.
  const remember = () => {
    const at = new Map<string, number>();
    row.current?.querySelectorAll<HTMLElement>('[data-flip]').forEach((element) => {
      at.set(element.dataset.flip!, element.getBoundingClientRect().left);
    });
    settleFrom.current = at;
  };

  useLayoutEffect(() => {
    const from = settleFrom.current;
    if (!from || !row.current) return;
    settleFrom.current = null;
    const elements = [...row.current.querySelectorAll<HTMLElement>('[data-flip]')];
    for (const element of elements) {
      const before = from.get(element.dataset.flip!);
      if (before === undefined) continue;
      const shift = before - element.getBoundingClientRect().left;
      if (Math.abs(shift) < 0.5) continue;
      element.style.transition = 'none';
      element.style.transform = `translateX(${shift}px)`;
    }
    void row.current.offsetWidth;
    for (const element of elements) {
      element.style.transition = SETTLE;
      element.style.transform = '';
    }
  }, [photos]);

  const lift = (id: string, clientX: number) => {
    const from = photos.findIndex((photo) => photo.id === id);
    const elements = [...(row.current?.querySelectorAll<HTMLElement>('[data-thumb-id]') ?? [])];
    if (from < 0 || !strip.current || elements.length !== photos.length) return;
    elements.forEach((element) => {
      element.style.transition = '';
      element.style.transform = '';
    });
    const slots = elements.map((element) => ({ left: element.offsetLeft, width: element.offsetWidth }));
    lastX.current = clientX;
    setBoth({ id, from, slots, startX: clientX, startScroll: strip.current.scrollLeft, x: 0, to: from });
    onSelect(from);
    tick();
  };

  // Everything follows from where the finger is: the photo's place, and the gap it would fill.
  const follow = (clientX: number) => {
    const current = dragRef.current;
    const element = strip.current;
    if (!current || !element) return;
    lastX.current = clientX;
    const { slots, from } = current;
    const own = slots[from];
    const end = slots[slots.length - 1].left + slots[slots.length - 1].width;
    const raw = clientX - current.startX + element.scrollLeft - current.startScroll;
    const x = Math.min(end - own.width - own.left, Math.max(slots[0].left - own.left, raw));
    const centre = own.left + x + own.width / 2;
    const rest = slots.map((slot, index) => ({ ...slot, index })).filter((slot) => slot.index !== from)
      .map((slot) => ({ ...slot, left: slot.index > from ? slot.left - own.width - GAP : slot.left }));
    const to = rest.filter((slot) => slot.left + slot.width / 2 < centre).length;
    if (to !== current.to) tick();
    setBoth({ ...current, x, to });
  };

  const drop = () => {
    const current = dragRef.current;
    if (!current) return;
    swallowClick.current = true;
    remember();
    setBoth(null);
    if (current.to !== current.from) onMove(current.from, current.to);
    else {
      // Nothing moved: it still settles back into its place rather than jumping.
      requestAnimationFrame(() => {
        const element = row.current?.querySelector<HTMLElement>(`[data-flip="${current.id}"]`);
        const before = settleFrom.current?.get(current.id);
        settleFrom.current = null;
        if (!element || before === undefined) return;
        const shift = before - element.getBoundingClientRect().left;
        element.style.transition = 'none';
        element.style.transform = `translateX(${shift}px)`;
        void element.offsetWidth;
        element.style.transition = SETTLE;
        element.style.transform = '';
      });
    }
  };

  // While something is held near an edge, the row keeps scrolling under it.
  useEffect(() => {
    if (!drag) return;
    let frame = 0;
    const step = () => {
      const element = strip.current;
      if (element && dragRef.current) {
        const box = element.getBoundingClientRect();
        const nearLeft = EDGE_PX - (lastX.current - box.left);
        const nearRight = EDGE_PX - (box.right - lastX.current);
        const speed = nearLeft > 0 ? -EDGE_SPEED * Math.min(1, nearLeft / EDGE_PX) : nearRight > 0 ? EDGE_SPEED * Math.min(1, nearRight / EDGE_PX) : 0;
        if (speed) {
          const before = element.scrollLeft;
          element.scrollLeft += speed;
          if (element.scrollLeft !== before) follow(lastX.current);
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag]);

  // Touch: a still finger picks the photo up, and from then on the page must not scroll.
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const start = (event: TouchEvent) => {
      swallowClick.current = false;
      const target = event.target as Element;
      const thumb = target.closest<HTMLElement>('[data-thumb-id]');
      if (!thumb || target.closest('[data-remove]') || event.touches.length > 1 || !canDrag) return;
      const touch = event.touches[0];
      const id = thumb.dataset.thumbId!;
      press.current = {
        id,
        x: touch.clientX,
        y: touch.clientY,
        mouse: false,
        timer: window.setTimeout(() => {
          if (press.current?.id === id) lift(id, press.current.x);
        }, LIFT_AFTER_MS),
      };
    };
    const move = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (dragRef.current) {
        event.preventDefault();
        follow(touch.clientX);
        return;
      }
      const held = press.current;
      if (held && Math.hypot(touch.clientX - held.x, touch.clientY - held.y) > STILL_PX) {
        clearTimeout(held.timer);
        press.current = null;
      }
    };
    const end = () => {
      if (press.current) clearTimeout(press.current.timer);
      press.current = null;
      drop();
    };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchmove', move, { passive: false });
    element.addEventListener('touchend', end);
    element.addEventListener('touchcancel', end);
    return () => {
      element.removeEventListener('touchstart', start);
      element.removeEventListener('touchmove', move);
      element.removeEventListener('touchend', end);
      element.removeEventListener('touchcancel', end);
    };
  });

  // Mouse: it comes out as soon as it is dragged.
  const handlePointerDown = (event: ReactPointerEvent, id: string) => {
    swallowClick.current = false;
    if (event.pointerType === 'touch' || event.button !== 0 || !canDrag) return;
    if ((event.target as Element).closest('[data-remove]')) return;
    press.current = { id, x: event.clientX, y: event.clientY, mouse: true };
    const moveWith = (moved: PointerEvent) => {
      if (dragRef.current) {
        follow(moved.clientX);
        return;
      }
      const held = press.current;
      if (held && Math.hypot(moved.clientX - held.x, moved.clientY - held.y) > MOUSE_DRAG_PX) lift(id, held.x);
    };
    const release = () => {
      window.removeEventListener('pointermove', moveWith);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      press.current = null;
      drop();
    };
    window.addEventListener('pointermove', moveWith);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  };

  const moveByKey = (from: number, to: number) => {
    remember();
    onMove(from, to);
  };

  const remove = (index: number, id: string) => {
    setLeaving(id);
    window.setTimeout(() => {
      setLeaving(null);
      remember();
      onRemove(index);
    }, LEAVE_MS);
  };

  // Where each photo is drawn while one is held.
  const placeOf = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    const own = drag.slots[drag.from];
    if (index === drag.from) return { transform: `translateX(${drag.x}px)`, transition: 'none', zIndex: 20 };
    const restIndex = index > drag.from ? index - 1 : index;
    let shift = index > drag.from ? -own.width - GAP : 0;
    if (restIndex === drag.to - 1) shift -= PART;
    if (restIndex === drag.to) shift += PART;
    return { transform: `translateX(${shift}px)`, transition: SETTLE };
  };

  const lineAt = (() => {
    if (!drag) return lastLine.current;
    const own = drag.slots[drag.from];
    const rest = drag.slots.filter((_, index) => index !== drag.from)
      .map((slot, restIndex) => ({ ...slot, left: restIndex >= drag.from ? slot.left - own.width - GAP : slot.left }));
    const before = rest[drag.to - 1];
    const after = rest[drag.to];
    const half = (GAP + 2 * PART) / 2;
    if (before && after) return (before.left + before.width - PART + after.left + PART) / 2;
    if (before) return before.left + before.width - PART + half;
    return (after?.left ?? 0) + PART - half;
  })();

  return (
    <div ref={strip} className="thumb-strip -mx-1 overflow-x-auto overflow-y-hidden px-1 py-2.5">
      <div ref={row} className="upload-thumbs relative flex w-max items-center" style={{ gap: GAP }}>
        {photos.map((photo, index) => {
          const lifted = drag?.id === photo.id;
          return (
            <div
              key={photo.id}
              data-thumb-id={photo.id}
              data-flip={photo.id}
              className={cn('upload-thumb relative shrink-0', leaving === photo.id && 'upload-thumb--leaving')}
              style={{ width: `calc(var(--thumb-h) * ${shapeOf(ratioOf(photo))})`, ...placeOf(index) }}
            >
              <div
                tabIndex={0}
                role="button"
                aria-label={es ? `Foto ${index + 1} de ${photos.length}` : `Photo ${index + 1} of ${photos.length}`}
                aria-pressed={index === selected}
                data-lifted={lifted || undefined}
                onPointerDown={(event) => handlePointerDown(event, photo.id)}
                onClick={() => {
                  if (swallowClick.current) {
                    swallowClick.current = false;
                    return;
                  }
                  onSelect(index);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelect(index);
                  if (event.key === 'ArrowLeft' && index > 0) moveByKey(index, index - 1);
                  if (event.key === 'ArrowRight' && index < photos.length - 1) moveByKey(index, index + 1);
                }}
                className={cn('upload-thumb-card', index === selected && 'upload-thumb-card--selected', canDrag && 'cursor-grab')}
              >
                <img
                  src={photo.url}
                  alt=""
                  draggable={false}
                  onLoad={(event) => {
                    if (photo.width && photo.height) return;
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth && naturalHeight) setRatios((current) => ({ ...current, [photo.id]: naturalWidth / naturalHeight }));
                  }}
                  className="w-full h-full rounded-[inherit] object-cover pointer-events-none"
                />
                {index === 0 && photos.length > 1 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] leading-none text-white backdrop-blur-sm">
                    {es ? 'Portada' : 'Cover'}
                  </span>
                )}
                <button
                  type="button"
                  data-remove
                  aria-label={es ? `Quitar foto ${index + 1}` : `Remove photo ${index + 1}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    remove(index, photo.id);
                  }}
                  className="ios-press tap-area absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-black/45 text-white backdrop-blur-sm"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          );
        })}
        {photos.length < max && (
          <button
            type="button"
            data-flip="add"
            onClick={onAdd}
            aria-label={es ? 'Añadir más fotos' : 'Add more photos'}
            style={drag ? { transform: `translateX(${-drag.slots[drag.from].width - GAP}px)`, transition: SETTLE } : { transition: SETTLE }}
            className="upload-thumb-add glass-button !p-0 !min-h-0 shrink-0 border-dashed"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
        <span aria-hidden="true" className={cn('upload-thumb-line', drag && 'upload-thumb-line--on')} style={{ transform: `translateX(${(lastLine.current = lineAt) - 1.5}px)` }} />
      </div>
    </div>
  );
}
