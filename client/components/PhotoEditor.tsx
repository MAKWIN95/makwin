import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import Reveal from '@/components/Reveal';
import Segmented from '@/components/Segmented';
import { useI18n } from '@/lib/i18n';
import { fitFor, fitsShape, NO_EDIT, placePhoto, RATIOS, type FrameStyle, type PhotoEdit, type PhotoSize } from '@/lib/frame-photo';
import { cn } from '@/lib/utils';

const MAX_ZOOM = 3;
const FRAME_UNITS = 1000;
const PLAIN_BORDERS = [
  { id: 'black', value: '#000000', es: 'Negro', en: 'Black' },
  { id: 'white', value: '#ffffff', es: 'Blanco', en: 'White' },
];

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

interface Props {
  url: string;
  size: PhotoSize;
  ratio: number;
  style: FrameStyle;
  edit: PhotoEdit;
  onEdit: (edit: PhotoEdit) => void;
  onStyle: (style: FrameStyle) => void;
  /** For a photo joining a carousel that already has its shape. */
  lockedShape?: boolean;
  /** Every photo the shape applies to; the choice for those that do not fit is only offered when one does not. */
  shapes?: PhotoSize[];
}

// The photo as it will be published. Drag it to place it, pinch or use the slider
// to bring it closer; the shape and the borders are the same for the whole work.
export default function PhotoEditor({ url, size, ratio, style, edit, onEdit, onStyle, lockedShape, shapes }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const [moving, setMoving] = useState(false);

  const frameH = FRAME_UNITS;
  const frameW = FRAME_UNITS * ratio;
  const place = placePhoto(size, frameW, frameH, fitFor(size, ratio, style.fit), edit);
  const thisFits = fitsShape(size, ratio);
  const someDoNotFit = (shapes ?? [size]).some((shape) => !fitsShape(shape, ratio));
  const percent = (value: number, of: number) => `${(value / of) * 100}%`;

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) pinch.current = { distance: spread(), zoom: edit.zoom };
    setMoving(true);
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size === 2) {
      onEdit({ ...edit, zoom: clamp((pinch.current.zoom * spread()) / pinch.current.distance, 1, MAX_ZOOM) });
      return;
    }
    const height = stage.current?.offsetHeight || 1;
    const toUnits = FRAME_UNITS / height;
    onEdit({
      ...edit,
      x: place.roomX ? clamp(edit.x + ((event.clientX - last.x) * toUnits) / place.roomX, -1, 1) : 0,
      y: place.roomY ? clamp(edit.y + ((event.clientY - last.y) * toUnits) / place.roomY, -1, 1) : 0,
    });
  };

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setMoving(false);
  };

  const isPlain = PLAIN_BORDERS.some((border) => border.value === style.border);
  const isCustom = style.border !== 'blur' && !isPlain;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-center">
        <div
          ref={stage}
          data-testid="photo-stage"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          style={{
            aspectRatio: ratio,
            width: `min(100%, calc(52vh * ${ratio}))`,
            background: style.border === 'blur' ? undefined : style.border,
          }}
          className="relative overflow-hidden rounded-lg touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {style.border === 'blur' && (
            <img src={url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl pointer-events-none" />
          )}
          <img
            src={url}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{
              left: percent(place.x, frameW),
              top: percent(place.y, frameH),
              width: percent(place.w, frameW),
              height: percent(place.h, frameH),
            }}
          />
          <div
            aria-hidden="true"
            className={cn('photo-grid absolute inset-0 pointer-events-none transition-opacity duration-200', moving ? 'opacity-100' : 'opacity-0')}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ZoomSlider
          label={es ? 'Acercar' : 'Zoom'}
          value={edit.zoom}
          min={1}
          max={MAX_ZOOM}
          onChange={(zoom) => onEdit({ ...edit, zoom })}
        />
        <button
          type="button"
          aria-label={es ? 'Volver a centrar la foto' : 'Centre the photo again'}
          onClick={() => onEdit(NO_EDIT)}
          disabled={edit.zoom === 1 && edit.x === 0 && edit.y === 0}
          className="header-button ios-press w-11 h-11 shrink-0 !rounded-full flex items-center justify-center text-[hsl(var(--foreground))] disabled:opacity-30 transition-opacity"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="photo-options">
        {!lockedShape && (
          <div className="photo-option">
            <p className="photo-option-title">{es ? 'Formato' : 'Shape'}</p>
            <Segmented
              label={es ? 'Formato' : 'Shape'}
              value={style.ratio}
              onChange={(ratio) => onStyle({ ...style, ratio })}
              options={RATIOS.map((option) => ({
                value: option.id,
                name: option.id === 'original' ? (es ? 'Original' : 'Original') : option.label,
                label: (
                  <span className="flex flex-col items-center gap-1">
                    <i
                      aria-hidden="true"
                      className="block rounded-[3px] border-[1.5px] border-current"
                      style={option.value === 0
                        ? { width: 12, height: 15, borderStyle: 'dashed' }
                        : option.value >= 1 ? { width: 16, height: 16 / option.value } : { height: 16, width: 16 * option.value }}
                    />
                    <span className="text-[10px] leading-none">{option.id === 'original' ? (es ? 'Original' : 'Original') : option.label}</span>
                  </span>
                ),
              }))}
            />
          </div>
        )}

        <Reveal open={someDoNotFit}>
          <div className="photo-options-group">
            <div className="photo-option">
              <p className="photo-option-title">{es ? 'Si no encaja' : 'If it does not fit'}</p>
              <Segmented
                label={es ? 'Si la foto no encaja en el formato' : 'If the photo does not fit the shape'}
                value={style.fit}
                onChange={(fit) => onStyle({ ...style, fit })}
                options={[
                  { value: 'contain', label: es ? 'Entera, con bordes' : 'Whole, with borders' },
                  { value: 'cover', label: es ? 'Recortarla' : 'Crop it' },
                ]}
              />
            </div>
            <Reveal open={thisFits}>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {es ? 'Esta foto ya encaja. Se aplica a las que no.' : 'This photo already fits. It applies to the ones that do not.'}
              </p>
            </Reveal>
            <Reveal open={style.fit === 'contain'}>
              <div className="photo-option">
                <p className="photo-option-title">{es ? 'Color de los bordes' : 'Border colour'}</p>
                <div className="flex items-start gap-4" role="radiogroup" aria-label={es ? 'Color de los bordes' : 'Border colour'}>
                  <Swatch label={es ? 'Difuminado' : 'Blurred'} chosen={style.border === 'blur'} onPick={() => onStyle({ ...style, border: 'blur' })}>
                    <img src={url} alt="" className="w-full h-full object-cover scale-150 blur-[3px]" />
                  </Swatch>
                  {PLAIN_BORDERS.map((border) => (
                    <Swatch key={border.id} label={es ? border.es : border.en} chosen={style.border === border.value} onPick={() => onStyle({ ...style, border: border.value })}>
                      <span className="block w-full h-full" style={{ background: border.value }} />
                    </Swatch>
                  ))}
                  <Swatch label={es ? 'Otro color' : 'Other colour'} chosen={isCustom}>
                    <span className="block w-full h-full" style={{ background: isCustom ? style.border : 'conic-gradient(#e66, #ec6, #6c6, #6ce, #66e, #e6c, #e66)' }} />
                    <input
                      type="color"
                      aria-label={es ? 'Elegir color de los bordes' : 'Choose border colour'}
                      value={isCustom ? style.border : '#808080'}
                      onChange={(event) => onStyle({ ...style, border: event.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Swatch>
                </div>
              </div>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Swatch({ label, chosen, onPick, children }: { label: string; chosen: boolean; onPick?: () => void; children: ReactNode }) {
  const Tag = onPick ? 'button' : 'label';
  return (
    <Tag
      {...(onPick ? { type: 'button' as const, onClick: onPick } : {})}
      role={onPick ? 'radio' : undefined}
      aria-checked={onPick ? chosen : undefined}
      className="photo-swatch ios-press"
      data-chosen={chosen || undefined}
    >
      <span className="photo-swatch-dot">{children}</span>
      <span className="text-[11px] leading-tight text-[hsl(var(--muted-foreground))]">{label}</span>
    </Tag>
  );
}

// Like the iPhone's: a wide bar that fills as it goes, easy to catch anywhere along it.
// A tap jumps there smoothly; a drag follows the finger exactly.
function ZoomSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(false);
  const [gliding, setGliding] = useState(false);
  const share = (value - min) / (max - min);

  const valueAt = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return value;
    return min + clamp((clientX - box.left) / box.width, 0, 1) * (max - min);
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeld(true);
    setGliding(true);
    onChange(valueAt(event.clientX));
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!held) return;
    setGliding(false);
    onChange(valueAt(event.clientX));
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = (max - min) / 20;
    const next = { ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step, Home: min, End: max }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setGliding(true);
    onChange(clamp(next, min, max));
  };

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0">
      <ZoomOut aria-hidden="true" className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value * 100) / 100}
        aria-valuetext={`${Math.round(value * 100)}%`}
        data-held={held || undefined}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={() => setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onKeyDown={handleKey}
        className="zoom-slider"
      >
        <span
          className={cn('zoom-slider-fill', gliding && 'zoom-slider-fill--gliding')}
          style={{ width: `calc(var(--zoom-h) + (100% - var(--zoom-h)) * ${share})` }}
        />
      </div>
      <ZoomIn aria-hidden="true" className="w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
    </div>
  );
}
