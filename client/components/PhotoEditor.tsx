import { useRef, useState, type PointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useI18n } from '@/lib/i18n';
import { NO_EDIT, placePhoto, RATIOS, type FrameStyle, type PhotoEdit, type PhotoSize } from '@/lib/frame-photo';
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
}

// The photo as it will be published. Drag it to place it, pinch or use the slider
// to bring it closer; the shape and the borders are the same for the whole work.
export default function PhotoEditor({ url, size, ratio, style, edit, onEdit, onStyle, lockedShape }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const [moving, setMoving] = useState(false);

  const frameH = FRAME_UNITS;
  const frameW = FRAME_UNITS * ratio;
  const place = placePhoto(size, frameW, frameH, style.fit, edit);
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

  const chip = 'glass-button !min-h-8 !px-3 text-xs';
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

      <div className="flex items-center gap-3">
        <Slider
          aria-label={es ? 'Acercar' : 'Zoom'}
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={[edit.zoom]}
          onValueChange={([zoom]) => onEdit({ ...edit, zoom })}
          className="flex-1"
        />
        <button
          type="button"
          aria-label={es ? 'Volver a centrar la foto' : 'Centre the photo again'}
          onClick={() => onEdit(NO_EDIT)}
          disabled={edit.zoom === 1 && edit.x === 0 && edit.y === 0}
          className="header-button ios-press w-9 h-9 flex items-center justify-center text-[hsl(var(--foreground))] disabled:opacity-30"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {!lockedShape && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={es ? 'Formato' : 'Shape'}>
          {RATIOS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={style.ratio === option.id}
              onClick={() => onStyle({ ...style, ratio: option.id })}
              className={cn(chip, style.ratio === option.id && 'glass-button--primary')}
            >
              {option.value > 0 && (
                <i
                  aria-hidden="true"
                  className="inline-block rounded-[2px] border border-current"
                  style={option.value >= 1 ? { width: 13, height: 13 / option.value } : { height: 13, width: 13 * option.value }}
                />
              )}
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={es ? 'Cómo se adapta la foto' : 'How the photo fits'}>
        <button type="button" role="radio" aria-checked={style.fit === 'contain'} onClick={() => onStyle({ ...style, fit: 'contain' })} className={cn(chip, style.fit === 'contain' && 'glass-button--primary')}>
          {es ? 'Con bordes' : 'With borders'}
        </button>
        <button type="button" role="radio" aria-checked={style.fit === 'cover'} onClick={() => onStyle({ ...style, fit: 'cover' })} className={cn(chip, style.fit === 'cover' && 'glass-button--primary')}>
          {es ? 'Recortar' : 'Crop'}
        </button>
      </div>

      {style.fit === 'contain' && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={es ? 'Borde' : 'Border'}>
          <button type="button" role="radio" aria-checked={style.border === 'blur'} onClick={() => onStyle({ ...style, border: 'blur' })} className={cn(chip, style.border === 'blur' && 'glass-button--primary')}>
            <i aria-hidden="true" className="relative inline-block w-3.5 h-3.5 overflow-hidden rounded-full">
              <img src={url} alt="" className="w-full h-full object-cover blur-[1px]" />
            </i>
            {es ? 'Difuminado' : 'Blurred'}
          </button>
          {PLAIN_BORDERS.map((border) => (
            <button key={border.id} type="button" role="radio" aria-checked={style.border === border.value} onClick={() => onStyle({ ...style, border: border.value })} className={cn(chip, style.border === border.value && 'glass-button--primary')}>
              <i aria-hidden="true" className="inline-block w-3.5 h-3.5 rounded-full border border-[hsl(var(--foreground)/0.3)]" style={{ background: border.value }} />
              {es ? border.es : border.en}
            </button>
          ))}
          <label className={cn(chip, 'relative cursor-pointer', isCustom && 'glass-button--primary')}>
            <i aria-hidden="true" className="inline-block w-3.5 h-3.5 rounded-full border border-[hsl(var(--foreground)/0.3)]" style={{ background: isCustom ? style.border : 'conic-gradient(#e66, #ec6, #6c6, #6ce, #66e, #e6c, #e66)' }} />
            {es ? 'Color' : 'Colour'}
            <input
              type="color"
              aria-label={es ? 'Elegir color del borde' : 'Choose border colour'}
              value={isCustom ? style.border : '#808080'}
              onChange={(event) => onStyle({ ...style, border: event.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      )}
    </div>
  );
}
