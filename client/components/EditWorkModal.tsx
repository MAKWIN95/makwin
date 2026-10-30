import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { normalizeHashtags, formatHashtagsForInput } from '@/lib/utils';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { cn } from '@/lib/utils';
import { prepareImage, readImage } from '@/lib/compress-image';
import { DEFAULT_FRAME, framePhoto, needsFraming, NO_EDIT, type FrameStyle, type PhotoEdit } from '@/lib/frame-photo';
import { DEFAULT_POEM_FONT, loadPoemFont, POEM_FONTS } from '@/lib/poem-fonts';
import { rememberWorkExtras, useWorkExtras } from '@/lib/work-extras';
import PhotoEditor from '@/components/PhotoEditor';
import UploadThumbs from '@/components/UploadThumbs';
import { Switch } from '@/components/ui/switch';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  work: Work;
  onSuccess: (work: Work) => void;
}

/** A photo already published has only its address; a new one still has its file. */
interface EditablePhoto {
  id: string;
  url: string;
  file?: File;
  width?: number;
  height?: number;
}

const MAX_PHOTOS = 10;

function sizeOfPublished(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth / image.naturalHeight);
    image.onerror = reject;
    image.src = url;
  });
}

const formOf = (work: Work) => ({
  title: work.title || '',
  description: work.description || '',
  lyrics: work.lyrics || '',
  hashtags: formatHashtagsForInput(work.hashtags),
  isForSale: !!work.is_for_sale,
  price: work.price ? String(work.price) : '',
});

export default function EditWorkModal({ isOpen, onClose, work, onSuccess }: Props) {
  const { language } = useI18n();
  const { user } = useAuth();
  const es = language === 'es';

  const [form, setForm] = useState(() => formOf(work));
  const extras = useWorkExtras(work);
  const [chosenFont, setChosenFont] = useState<string | null>(null);
  const font = chosenFont ?? work.poem_font ?? extras?.poem_font ?? DEFAULT_POEM_FONT;
  const isPoem = work.work_type === 'poema';
  const isSong = work.work_type === 'cancion';
  const isPhotoWork = work.work_type === 'pintura' || work.work_type === 'fotografia';

  const publishedPhotos: EditablePhoto[] = [work.file_url, ...(extras?.extra_images ?? work.extra_images ?? [])]
    .filter((url): url is string => !!url)
    .map((url) => ({ id: url, url }));
  // Left alone, the photos are not even sent: nothing about them has changed.
  const [chosenPhotos, setChosenPhotos] = useState<EditablePhoto[] | null>(null);
  const photos = chosenPhotos ?? publishedPhotos;
  const [selected, setSelected] = useState(0);
  const [shape, setShape] = useState<number | null>(null);
  const [frame, setFrame] = useState<FrameStyle>(DEFAULT_FRAME);
  const [edits, setEdits] = useState<Record<string, PhotoEdit>>({});
  const [preparing, setPreparing] = useState(false);
  const pickInput = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firstNew = photos.find((photo) => photo.file);
  const ratio = shape ?? (firstNew?.width && firstNew.height ? firstNew.width / firstNew.height : 1);
  const current = photos[Math.min(selected, photos.length - 1)];

  useEffect(() => {
    if (!isOpen) return;
    setForm(formOf(work));
    setChosenFont(null);
    setChosenPhotos(null);
    setSelected(0);
    setShape(null);
    setFrame(DEFAULT_FRAME);
    setEdits({});
    setError('');
    const urls = previews.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
    // Starts again each time it opens, from the work as it is by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const addPhotos = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) toast.error(es ? `Un carrusel puede tener hasta ${MAX_PHOTOS} fotos.` : `A carousel can have up to ${MAX_PHOTOS} photos.`);
    setPreparing(true);
    const added: EditablePhoto[] = [];
    // One at a time: a phone cannot hold several huge photos open at once.
    for (const file of files.slice(0, Math.max(0, room))) {
      if (!file.type.startsWith('image/') || file.type === 'image/gif') {
        toast.error(es ? `${file.name} no se puede añadir. Usa PNG, JPG o WebP.` : `${file.name} cannot be added. Use PNG, JPG or WebP.`);
        continue;
      }
      try {
        const ready = await prepareImage(file);
        const { naturalWidth: width, naturalHeight: height } = await readImage(ready);
        const url = URL.createObjectURL(ready);
        previews.current.add(url);
        added.push({ id: crypto.randomUUID(), url, file: ready, width, height });
      } catch {
        toast.error(es ? `No hemos podido abrir ${file.name}.` : `We could not open ${file.name}.`);
      }
    }
    const firstPublished = photos.find((photo) => !photo.file);
    if (shape === null && firstPublished) {
      setShape(await sizeOfPublished(firstPublished.url).catch(() => null));
    }
    setPreparing(false);
    if (!added.length) return;
    setChosenPhotos([...photos, ...added]);
    setSelected(photos.length);
  };

  const movePhoto = (from: number, to: number) => {
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setChosenPhotos(next);
    setSelected(to);
  };

  const removePhoto = (index: number) => {
    if (photos.length === 1) {
      toast.error(es ? 'Una obra necesita al menos una foto. Si no la quieres, elimina la obra.' : 'A work needs at least one photo. If you do not want it, delete the work.');
      return;
    }
    setChosenPhotos(photos.filter((_, position) => position !== index));
    setSelected((position) => Math.max(0, position > index ? position - 1 : Math.min(position, photos.length - 2)));
  };

  const sendPhotos = async (): Promise<string[]> => {
    const stamp = Date.now();
    const urls: string[] = [];
    for (const [position, photo] of photos.entries()) {
      if (!photo.file) {
        urls.push(photo.url);
        continue;
      }
      const edit = edits[photo.id] ?? NO_EDIT;
      const file = needsFraming({ width: photo.width!, height: photo.height! }, ratio, edit)
        ? await framePhoto(photo.file, ratio, frame, edit)
        : photo.file;
      const path = `${user?.id}/${stamp}-${position}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('works').upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      urls.push(supabase.storage.from('works').getPublicUrl(path).data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.isForSale && !(Number(form.price) > 0)) {
      setError(es ? 'Indica un precio mayor que cero.' : 'Enter a price above zero.');
      return;
    }
    setLoading(true);

    try {
      const images = chosenPhotos ? await sendPhotos() : undefined;
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/publish-work', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          id: work.id,
          title: form.title,
          description: form.description,
          hashtags: normalizeHashtags(form.hashtags),
          isForSale: form.isForSale,
          price: form.isForSale ? Number(form.price) : null,
          ...(images ? { images } : {}),
          ...(isSong ? { lyrics: form.lyrics } : {}),
          ...(isPoem ? { poemFont: font } : {}),
        }),
      });
      if (response.status === 409) {
        setError(es ? 'Todavía estamos comprobando tus últimos cambios. Vuelve a intentarlo en unos segundos.' : 'We are still checking your last changes. Try again in a few seconds.');
        setLoading(false);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { work: saved, held, checking } = await response.json();
      rememberWorkExtras(work.id, { extra_images: saved.extra_images ?? [], poem_font: saved.poem_font ?? null });
      if (held) {
        toast.info(es ? 'Tu obra se revisará antes de volver a mostrarse.' : 'Your work will be reviewed before it is shown again.');
      } else if (checking) {
        toast.info(es ? 'Estamos comprobando los cambios. Volverá a verse en unos segundos.' : 'We are checking the changes. It will be back in a few seconds.');
      } else {
        toast.success(es ? 'Cambios guardados.' : 'Changes saved.');
      }
      onSuccess(saved);
    } catch (updateError) {
      console.error('[EditWorkModal] Could not save:', updateError);
      setError(es ? 'No se han podido guardar los cambios. Inténtalo de nuevo.' : 'The changes could not be saved. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
  };

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen && isPoem) POEM_FONTS.forEach((item) => loadPoemFont(item.id));
  }, [isOpen, isPoem]);

  if (!isOpen) return null;

  const labelClass = 'text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block';
  const fieldClass = 'w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm placeholder:text-[hsl(var(--muted-foreground))]';

  // Rendered on <body>: opened from inside work cards, whose stacking and hover
  // effects must not clip or reposition this fixed overlay.
  return createPortal(
    <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain glass-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[rgba(120,120,120,0.25)]">
          <h2 className="text-lg font-light text-[hsl(var(--foreground))]">
            {es ? 'Editar obra' : 'Edit work'}
          </h2>
          <button
            onClick={onClose}
            aria-label={es ? 'Cerrar' : 'Close'}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          {isPhotoWork && (
            <div>
              <label className={labelClass}>
                {es ? 'Fotos: arrastra para cambiar el orden. La primera es la portada.' : 'Photos: drag to change the order. The first one is the cover.'}
              </label>
              <input
                ref={pickInput}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                data-testid="edit-pick-photos"
                onChange={(event) => {
                  void addPhotos(event.target.files);
                  event.target.value = '';
                }}
              />
              <UploadThumbs
                photos={photos}
                selected={Math.min(selected, photos.length - 1)}
                max={MAX_PHOTOS}
                onSelect={setSelected}
                onMove={movePhoto}
                onRemove={removePhoto}
                onAdd={() => pickInput.current?.click()}
              />
              {preparing && (
                <p className="mt-2 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {es ? 'Preparando las fotos...' : 'Preparing the photos...'}
                </p>
              )}
              {current?.file && (
                <div className="mt-3">
                  <PhotoEditor
                    url={current.url}
                    size={{ width: current.width!, height: current.height! }}
                    ratio={ratio}
                    style={frame}
                    edit={edits[current.id] ?? NO_EDIT}
                    onEdit={(edit) => setEdits((all) => ({ ...all, [current.id]: edit }))}
                    onStyle={setFrame}
                    lockedShape
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>
              {es ? 'Título' : 'Title'}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className={fieldClass}
              placeholder={es ? 'Título de la obra' : 'Work title'}
              required
            />
          </div>

          <div>
            <label className={labelClass}>
              {isPoem ? (es ? 'Poema' : 'Poem') : (es ? 'Descripción' : 'Description')}
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn(fieldClass, 'resize-none')}
              rows={isPoem ? 8 : 4}
              required={isPoem && !work.file_url}
              placeholder={isPoem ? (es ? 'Poema' : 'Poem') : (es ? 'Descripción' : 'Description')}
            />
          </div>

          {isSong && (
            <div>
              <label className={labelClass}>
                {es ? 'Letra' : 'Lyrics'}
              </label>
              <textarea
                value={form.lyrics}
                onChange={e => setForm(p => ({ ...p, lyrics: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className={cn(fieldClass, 'resize-none')}
                rows={6}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>
              {es ? 'Hashtags (separados por espacio)' : 'Hashtags (space separated)'}
            </label>
            <input
              type="text"
              value={form.hashtags}
              onChange={e => setForm(p => ({ ...p, hashtags: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className={fieldClass}
              placeholder="#arte #musica"
            />
          </div>

          {isPoem && (
            <div>
              <label className={labelClass}>
                {es ? 'Fuente del poema' : 'Poem typeface'}
              </label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={es ? 'Fuente del poema' : 'Poem typeface'}>
                {POEM_FONTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={font === item.id}
                    onClick={() => setChosenFont(item.id)}
                    style={{ fontFamily: item.family }}
                    className={cn('glass-button !min-h-9 !px-3', font === item.id && 'glass-button--primary')}
                  >
                    {es ? item.es : item.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[hsl(var(--foreground))]">{es ? 'Poner a la venta' : 'Put up for sale'}</span>
            <Switch
              aria-label={es ? 'Poner a la venta' : 'Put up for sale'}
              checked={form.isForSale}
              onCheckedChange={(isForSale) => setForm(p => ({ ...p, isForSale }))}
            />
          </div>
          {form.isForSale && (
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.price}
              onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={es ? 'Precio' : 'Price'}
              placeholder={es ? 'Precio' : 'Price'}
              className={fieldClass}
            />
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || preparing}
              className="flex-1 glass-button glass-button--primary gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Guardar' : 'Save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 glass-button"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
