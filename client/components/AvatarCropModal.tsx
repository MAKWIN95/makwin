import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Loader2 } from 'lucide-react';
import { ZoomSlider } from '@/components/PhotoEditor';
import { useI18n } from '@/lib/i18n';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { NO_EDIT, placePhoto, type PhotoEdit, type PhotoSize } from '@/lib/frame-photo';

const MAX_ZOOM = 4;
/** Room around the frame, as a share of the stage, where what will be cut off still shows. */
const INSET = 0.09;
const FRAME = 1000;
const STAGE = FRAME / (1 - 2 * INSET);
/** The saved photo: a face is never shown bigger than a few centimetres. */
const OUT = 512;
const CLOSE_MS = 200;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const percent = (value: number, of: number) => `${(value / of) * 100}%`;

interface Props {
  file: File;
  name: string;
  username: string;
  /** Says whether a newly chosen file can be used (and explains why not when it cannot). */
  accept: (file: File) => boolean;
  onSave: (photo: Blob) => void;
  onClose: () => void;
}

// Choosing a profile photo: drag it inside the frame, pinch or slide to bring it
// closer, and see it as people will see it on your profile before saving.
export default function AvatarCropModal({ file: firstFile, name, username, accept, onSave, onClose }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const [file, setFile] = useState(firstFile);
  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<PhotoSize | null>(null);
  const [edit, setEdit] = useState<PhotoEdit>(NO_EDIT);
  const [dragging, setDragging] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [wheeling, setWheeling] = useState(false);
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const wheelTimer = useRef<number>();
  const another = useRef<HTMLInputElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const next = URL.createObjectURL(file);
    const picture = new Image();
    picture.onload = () => {
      image.current = picture;
      setSize({ width: picture.naturalWidth, height: picture.naturalHeight });
      setUrl(next);
      setEdit(NO_EDIT);
    };
    picture.src = next;
    return () => URL.revokeObjectURL(next);
  }, [file]);

  useEffect(() => () => window.clearTimeout(wheelTimer.current), []);

  const close = (then?: () => void) => {
    if (closing) return;
    setClosing(true);
    then?.();
    window.setTimeout(onClose, CLOSE_MS);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const place = size ? placePhoto(size, FRAME, FRAME, 'cover', edit) : null;
  const moving = dragging || sliding || wheeling;

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) pinch.current = { distance: spread(), zoom: edit.zoom };
    setDragging(true);
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last || !place) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current && pointers.current.size === 2) {
      setEdit({ ...edit, zoom: clamp((pinch.current.zoom * spread()) / pinch.current.distance, 1, MAX_ZOOM) });
      return;
    }
    if (pointers.current.size > 1) return;
    const toUnits = STAGE / (stage.current?.offsetWidth || 1);
    setEdit({
      ...edit,
      x: place.roomX ? clamp(edit.x + ((event.clientX - last.x) * toUnits) / place.roomX, -1, 1) : 0,
      y: place.roomY ? clamp(edit.y + ((event.clientY - last.y) * toUnits) / place.roomY, -1, 1) : 0,
    });
  };

  const handleUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  // A mouse wheel or a trackpad brings the photo closer, like a pinch.
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    setEdit((current) => ({ ...current, zoom: clamp(current.zoom * Math.exp(-event.deltaY * 0.002), 1, MAX_ZOOM) }));
    setWheeling(true);
    window.clearTimeout(wheelTimer.current);
    wheelTimer.current = window.setTimeout(() => setWheeling(false), 350);
  };

  const handleAnother = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = '';
    if (next && accept(next)) setFile(next);
  };

  const handleSave = async () => {
    const picture = image.current;
    if (!picture || !size || saving) return;
    setSaving(true);
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const context = canvas.getContext('2d');
    if (!context) { setSaving(false); return; }
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#111111';
    context.fillRect(0, 0, OUT, OUT);
    const out = placePhoto(size, OUT, OUT, 'cover', edit);
    context.drawImage(picture, out.x, out.y, out.w, out.h);
    const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!photo) { setSaving(false); return; }
    close(() => onSave(photo));
  };

  // The photo inside a box shaped like the frame, at any size.
  const photoInFrame = (offset: number, of: number) => place && url && (
    <img
      src={url}
      alt=""
      draggable={false}
      className="absolute max-w-none pointer-events-none select-none"
      style={{
        left: percent(offset + place.x, of),
        top: percent(offset + place.y, of),
        width: percent(place.w, of),
        height: percent(place.h, of),
      }}
    />
  );

  return createPortal(
    <div
      className="avatar-crop-overlay fixed inset-0 z-[70] flex items-center justify-center p-4"
      data-closing={closing || undefined}
      role="dialog"
      aria-modal="true"
      aria-label={es ? 'Ajustar foto de perfil' : 'Adjust profile photo'}
    >
      <div className="avatar-crop-stack flex flex-col gap-2">
        <div className="avatar-crop-card glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 min-h-11">
            <h2 className="text-base font-light text-[hsl(var(--foreground))]">{es ? 'Ajusta tu foto' : 'Adjust your photo'}</h2>
            <button
              type="button"
              onClick={() => another.current?.click()}
              className="header-button ios-press inline-flex items-center gap-1.5 h-11 px-3 text-sm text-[hsl(var(--foreground))]"
            >
              <ImagePlus className="w-4 h-4" /> {es ? 'Otra foto' : 'Another photo'}
            </button>
            <input ref={another} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleAnother} className="hidden" aria-label={es ? 'Elegir otra foto' : 'Choose another photo'} />
          </div>

          <div
            ref={stage}
            data-testid="avatar-stage"
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onWheel={handleWheel}
            className="relative w-full aspect-square overflow-hidden rounded-xl bg-black touch-none select-none cursor-grab active:cursor-grabbing"
          >
            {photoInFrame(FRAME * INSET / (1 - 2 * INSET), STAGE)}
            <div
              aria-hidden="true"
              className="avatar-crop-frame"
              data-moving={moving || undefined}
              style={{ inset: percent(INSET, 1) }}
            />
            {!url && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/70" />
              </div>
            )}
          </div>

          <ZoomSlider
            label={es ? 'Acercar' : 'Zoom'}
            value={edit.zoom}
            min={1}
            max={MAX_ZOOM}
            onChange={(zoom) => setEdit((current) => ({ ...current, zoom }))}
            onHold={setSliding}
          />

          <div className="flex gap-2">
            <button type="button" onClick={() => close()} className="flex-1 glass-button">
              {es ? 'Cancelar' : 'Cancel'}
            </button>
            <button type="button" onClick={handleSave} disabled={!url || saving} className="flex-1 glass-button glass-button--primary disabled:opacity-50">
              {es ? 'Guardar' : 'Save'}
            </button>
          </div>
        </div>

        {/* How people will see it at the top of your profile. */}
        <div className="avatar-crop-card avatar-crop-card--second glass-panel p-4 flex items-center gap-4" aria-label={es ? 'Vista previa de tu perfil' : 'Preview of your profile'}>
          <div className="relative w-16 h-16 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))]">
            {photoInFrame(0, FRAME)}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-light text-[hsl(var(--foreground))] truncate">{name}</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">@{username}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
