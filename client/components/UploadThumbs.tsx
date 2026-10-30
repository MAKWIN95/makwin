import { useRef, useState, type PointerEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface UploadMedia {
  id: string;
  file: File;
  url: string;
}

interface Props {
  photos: UploadMedia[];
  selected: number;
  max: number;
  onSelect: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

const DRAG_START_PX = 6;

// The order of the carousel: drag a photo to move it, the first one is the cover.
export default function UploadThumbs({ photos, selected, max, onSelect, onMove, onRemove, onAdd }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  const [dragging, setDragging] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number; id: string } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>, id: string) => {
    if ((event.target as Element).closest('button[data-remove]')) return;
    start.current = { x: event.clientX, y: event.clientY, id };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    if (!dragging) {
      if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) < DRAG_START_PX) return;
      setDragging(start.current.id);
    }
    const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-thumb]');
    if (!over) return;
    const from = photos.findIndex((photo) => photo.id === start.current?.id);
    const to = Number(over.dataset.thumb);
    if (from !== to && from >= 0) onMove(from, to);
  };

  const handlePointerEnd = (index: number) => {
    if (start.current && !dragging) onSelect(index);
    start.current = null;
    setDragging(null);
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          data-thumb={index}
          tabIndex={0}
          role="button"
          aria-label={es ? `Foto ${index + 1} de ${photos.length}` : `Photo ${index + 1} of ${photos.length}`}
          onPointerDown={(event) => handlePointerDown(event, photo.id)}
          onPointerMove={handlePointerMove}
          onPointerUp={() => handlePointerEnd(index)}
          onPointerCancel={() => {
            start.current = null;
            setDragging(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onSelect(index);
            if (event.key === 'ArrowLeft' && index > 0) onMove(index, index - 1);
            if (event.key === 'ArrowRight' && index < photos.length - 1) onMove(index, index + 1);
          }}
          className={cn(
            'relative aspect-square rounded-xl touch-none select-none cursor-grab outline-none transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
            index === selected && 'ring-2 ring-[hsl(var(--foreground))] ring-offset-2 ring-offset-transparent',
            dragging === photo.id && 'z-10 scale-110 cursor-grabbing shadow-xl',
          )}
        >
          <img src={photo.url} alt="" draggable={false} className="w-full h-full rounded-xl object-cover pointer-events-none" />
          {index === 0 && photos.length > 1 && (
            <span className="absolute bottom-1 left-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] leading-none text-white backdrop-blur-sm">
              {es ? 'Portada' : 'Cover'}
            </span>
          )}
          <button
            type="button"
            data-remove
            aria-label={es ? `Quitar foto ${index + 1}` : `Remove photo ${index + 1}`}
            onClick={() => onRemove(index)}
            className="ios-press absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-black/45 text-white backdrop-blur-sm"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      ))}
      {photos.length < max && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={es ? 'Añadir más fotos' : 'Add more photos'}
          className="glass-button !p-0 !min-h-0 aspect-square !rounded-xl border-dashed"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
