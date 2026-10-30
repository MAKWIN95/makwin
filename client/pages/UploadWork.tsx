import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Feather, ImagePlus, Loader2, Mic, Music, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCarousel from '@/components/WorkCarousel';
import UploadThumbs, { type UploadMedia } from '@/components/UploadThumbs';
import { Switch } from '@/components/ui/switch';
import { cn, normalizeHashtags } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_IMAGE_MB = 10;
const MAX_AUDIO_MB = 50;
const MAX_VIDEO_MB = 50;
const MAX_PHOTOS = 10;

// What was picked decides the rest: photos become a carousel, one video or one
// audio stands alone, and a poem starts from its text.
type Kind = 'photos' | 'video' | 'audio' | 'poem';
type Progress = { step: 'uploading'; done: number; total: number } | { step: 'checking' } | { step: 'done' } | null;

const newMedia = (file: File): UploadMedia => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
const extensionOf = (file: File) => file.name.split('.').pop();

export default function UploadWork() {
  useRequireAuth();
  const { user, profile } = useAuth();
  const { language } = useI18n();
  const navigate = useNavigate();
  const es = language === 'es';

  const [kind, setKind] = useState<Kind | null>(null);
  const [photos, setPhotos] = useState<UploadMedia[]>([]);
  const [selected, setSelected] = useState(0);
  const [media, setMedia] = useState<UploadMedia | null>(null);
  const [cover, setCover] = useState<UploadMedia | null>(null);
  const [workType, setWorkType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [price, setPrice] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<Progress>(null);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const pickInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  // A failed publish can be retried without sending the same files again.
  const uploaded = useRef(new Map<string, string>());
  const previews = useRef(new Set<string>());

  const track = (item: UploadMedia) => {
    previews.current.add(item.url);
    return item;
  };

  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    if (kind) window.scrollTo({ top: 0 });
  }, [kind]);

  // Asking again is only meant for the tap that follows.
  useEffect(() => {
    if (!confirmDiscard) return;
    const timer = setTimeout(() => setConfirmDiscard(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDiscard]);

  const fileProblem = (file: File): string | null => {
    const mb = file.size / 1024 / 1024;
    if (file.name.toLowerCase().endsWith('.gif')) return es ? 'Los GIF no están permitidos. Usa PNG, JPG o WebP.' : 'GIFs are not allowed. Use PNG, JPG or WebP.';
    if (file.type.startsWith('image/') && mb > MAX_IMAGE_MB) return es ? `${file.name} supera los ${MAX_IMAGE_MB} MB.` : `${file.name} is over ${MAX_IMAGE_MB} MB.`;
    if (file.type.startsWith('video/') && mb > MAX_VIDEO_MB) return es ? `El vídeo no puede superar ${MAX_VIDEO_MB} MB.` : `The video cannot exceed ${MAX_VIDEO_MB} MB.`;
    if (file.type.startsWith('audio/') && mb > MAX_AUDIO_MB) return es ? `El audio no puede superar ${MAX_AUDIO_MB} MB.` : `The audio cannot exceed ${MAX_AUDIO_MB} MB.`;
    return null;
  };

  const addPhotos = (files: File[]) => {
    const valid: File[] = [];
    for (const file of files) {
      const problem = file.type.startsWith('image/') ? fileProblem(file) : (es ? `${file.name} no es una imagen.` : `${file.name} is not an image.`);
      if (problem) toast.error(problem);
      else valid.push(file);
    }
    const room = MAX_PHOTOS - photos.length;
    if (valid.length > room) toast.error(es ? `Un carrusel puede tener hasta ${MAX_PHOTOS} fotos.` : `A carousel can have up to ${MAX_PHOTOS} photos.`);
    const added = valid.slice(0, Math.max(0, room)).map((file) => track(newMedia(file)));
    if (!added.length) return;
    setPhotos((current) => [...current, ...added]);
    setKind('photos');
  };

  const handleFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    const first = files[0];
    if (!first) return;
    if (first.type.startsWith('image/')) return addPhotos(files);

    const isVideo = first.type.startsWith('video/');
    if (!isVideo && !first.type.startsWith('audio/')) {
      toast.error(es ? 'Ese tipo de archivo no se puede subir.' : 'That type of file cannot be uploaded.');
      return;
    }
    const problem = fileProblem(first);
    if (problem) {
      toast.error(problem);
      return;
    }
    setMedia(track(newMedia(first)));
    setKind(isVideo ? 'video' : 'audio');
    setWorkType(isVideo ? 'video' : 'cancion');
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  };

  const pickCover = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    const problem = file.type.startsWith('image/') ? fileProblem(file) : (es ? 'La portada tiene que ser una imagen.' : 'The cover must be an image.');
    if (problem) {
      toast.error(problem);
      return;
    }
    setCover(track(newMedia(file)));
  };

  const pickRecital = (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    const problem = file.type.startsWith('audio/') ? fileProblem(file) : (es ? 'Tiene que ser un archivo de audio.' : 'It must be an audio file.');
    if (problem) {
      toast.error(problem);
      return;
    }
    setMedia(track(newMedia(file)));
  };

  const startPoem = () => {
    setKind('poem');
    setWorkType('poema');
  };

  const startOver = () => {
    setKind(null);
    setPhotos([]);
    setSelected(0);
    setMedia(null);
    setCover(null);
    setWorkType('');
    setError('');
    setConfirmDiscard(false);
    uploaded.current.clear();
  };

  const movePhoto = (from: number, to: number) => {
    setPhotos((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSelected(to);
  };

  const removePhoto = (index: number) => {
    const next = photos.filter((_, position) => position !== index);
    setPhotos(next);
    setSelected((current) => Math.min(current > index ? current - 1 : current, Math.max(0, next.length - 1)));
    if (!next.length) startOver();
  };

  const commitTag = () => {
    const added = normalizeHashtags(tagDraft);
    if (added.length) setTags((current) => Array.from(new Set([...current, ...added])));
    setTagDraft('');
  };

  const handleTagKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ') {
      event.preventDefault();
      commitTag();
    } else if (event.key === 'Backspace' && !tagDraft) {
      setTags((current) => current.slice(0, -1));
    }
  };

  const uploadOnce = async (item: UploadMedia, path: string): Promise<string> => {
    const known = uploaded.current.get(item.id);
    if (known) return known;
    const { error: uploadError } = await supabase.storage.from('works').upload(path, item.file, { upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    const { data: { publicUrl } } = supabase.storage.from('works').getPublicUrl(path);
    uploaded.current.set(item.id, publicUrl);
    return publicUrl;
  };

  const missing = (): string | null => {
    if (!title.trim()) return es ? 'Ponle un título a tu obra.' : 'Give your work a title.';
    if (!workType) return es ? '¿Es una pintura o una fotografía?' : 'Is it a painting or a photograph?';
    if (!description.trim()) {
      if (workType === 'poema' && kind === 'poem') return es ? 'Escribe tu poema.' : 'Write your poem.';
      return es ? 'Cuenta algo sobre esta obra.' : 'Say something about this work.';
    }
    if (workType === 'cancion' && !lyrics.trim()) return es ? 'Añade la letra de la canción.' : 'Add the song lyrics.';
    if (isForSale && !(Number(price) > 0)) return es ? 'Indica un precio mayor que cero.' : 'Enter a price above zero.';
    return null;
  };

  const publish = async () => {
    const problem = missing();
    setError(problem ?? '');
    if (problem) return;
    if (!user) return;

    const files = [...photos, ...(media ? [media] : []), ...(cover ? [cover] : [])];
    const stamp = Date.now();
    let done = 0;
    setProgress({ step: 'uploading', done, total: files.length });
    const send = async (item: UploadMedia, path: string) => {
      const url = await uploadOnce(item, path);
      done += 1;
      setProgress({ step: 'uploading', done, total: files.length });
      return url;
    };

    try {
      const photoUrls: string[] = [];
      for (const [position, photo] of photos.entries()) {
        photoUrls.push(await send(photo, `${user.id}/${stamp}-${position}.${extensionOf(photo.file)}`));
      }
      const mediaUrl = media ? await send(media, `${user.id}/${stamp}.${extensionOf(media.file)}`) : null;
      const coverUrl = cover ? await send(cover, `${user.id}/covers/${stamp}.${extensionOf(cover.file)}`) : null;

      setProgress({ step: 'checking' });
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/publish-work', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          title,
          description,
          workType,
          fileUrl: photoUrls[0] ?? mediaUrl,
          extraImages: photoUrls.slice(1),
          coverUrl,
          lyrics,
          hashtags: normalizeHashtags([...tags, tagDraft]),
          isForSale,
          price: isForSale && price ? Number(price) : null,
          language,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { id, held } = await response.json();

      setProgress({ step: 'done' });
      await new Promise((resolve) => setTimeout(resolve, 650));
      if (held) {
        toast.info(es ? 'Tu obra se está revisando. Te avisaremos por correo.' : 'Your work is being reviewed. We will let you know by email.', { duration: 8000 });
        navigate(profile?.username ? `/u/${profile.username}` : '/');
      } else {
        navigate(`/work/${id}`);
      }
    } catch (err: any) {
      console.error('[UploadWork] Could not publish:', err);
      setProgress(null);
      const tooBig = /exceeded|too large|payload/i.test(err?.message ?? '');
      setError(tooBig
        ? (es ? 'Algún archivo es demasiado grande.' : 'A file is too large.')
        : (es ? 'No se pudo publicar. Comprueba tu conexión e inténtalo de nuevo.' : 'It could not be published. Check your connection and try again.'));
    }
  };

  const typeChips = kind === 'photos'
    ? [['pintura', es ? 'Pintura' : 'Painting'], ['fotografia', es ? 'Fotografía' : 'Photography']]
    : kind === 'audio'
      ? [['cancion', es ? 'Canción' : 'Song'], ['poema', es ? 'Poema recitado' : 'Spoken poem']]
      : [];

  const fieldText = 'w-full bg-transparent text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] !outline-none';
  const section = 'px-5 py-4';

  const publishLabel = es ? 'Publicar' : 'Publish';
  const busy = !!progress;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header hideSearch />
      <input
        ref={pickInput}
        type="file"
        multiple
        accept={kind === 'photos' ? 'image/*' : 'image/*,video/*,audio/*'}
        className="hidden"
        data-testid="pick-files"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(event) => { pickCover(event.target.files); event.target.value = ''; }} />
      <input ref={audioInput} type="file" accept="audio/*" className="hidden" onChange={(event) => { pickRecital(event.target.files); event.target.value = ''; }} />

      <main className="w-full page-enter">
        <div className={cn('sm:px-8 sm:py-10', !kind && 'px-4 py-6')}>
          {!kind ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn('upload-stage glass-panel mx-auto max-w-2xl flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24', dragOver && 'upload-stage--over')}
            >
              <ImagePlus className="w-12 h-12 mb-5 text-[hsl(var(--foreground))]" strokeWidth={1.25} />
              <h1 className="text-2xl font-light tracking-tight text-[hsl(var(--foreground))] mb-2">
                {es ? 'Comparte tu obra' : 'Share your work'}
              </h1>
              <p className="max-w-xs text-sm text-[hsl(var(--muted-foreground))] mb-7">
                {es
                  ? `Arrastra aquí tus fotos, un vídeo o un audio. Puedes subir hasta ${MAX_PHOTOS} fotos en un mismo carrusel.`
                  : `Drop your photos, a video or an audio here. A carousel can hold up to ${MAX_PHOTOS} photos.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => pickInput.current?.click()} className="glass-button glass-button--primary">
                  {es ? 'Elegir archivos' : 'Choose files'}
                </button>
                <button type="button" onClick={startPoem} className="glass-button">
                  <Feather className="w-4 h-4" />
                  {es ? 'Escribir un poema' : 'Write a poem'}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative glass-panel max-sm:!rounded-none max-sm:!border-x-0 max-sm:!border-t-0 max-sm:!shadow-none mx-auto max-w-5xl overflow-hidden" data-kind={kind}>
              {/* Top bar */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 h-14 border-b border-[hsl(var(--foreground)/0.1)]">
                {confirmDiscard ? (
                  <button type="button" onClick={startOver} className="glass-button glass-button--danger !min-h-9 !px-3 justify-self-start text-xs">
                    {es ? '¿Descartar?' : 'Discard?'}
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirmDiscard(true)} aria-label={es ? 'Descartar' : 'Discard'} className="header-button ios-press justify-self-start w-10 h-10 flex items-center justify-center text-[hsl(var(--foreground))]">
                    <X className="w-5 h-5" />
                  </button>
                )}
                <h1 className="text-sm font-medium text-[hsl(var(--foreground))]">{es ? 'Nueva obra' : 'New work'}</h1>
                <button type="button" onClick={publish} disabled={busy} className="glass-button glass-button--primary !min-h-9 !px-4 justify-self-end max-lg:hidden">
                  {publishLabel}
                </button>
              </div>

              <div className="lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                {/* Left: the work itself */}
                <div className="p-4 sm:p-5 lg:border-r border-[hsl(var(--foreground)/0.1)] flex flex-col gap-4 min-w-0">
                  {kind === 'photos' && (
                    <>
                      <WorkCarousel className="[&_img]:max-h-[44vh] lg:[&_img]:max-h-[56vh]" images={photos.map((photo) => photo.url)} alt={title || (es ? 'Tu obra' : 'Your work')} index={selected} onIndexChange={setSelected} />
                      <UploadThumbs
                        photos={photos}
                        selected={selected}
                        max={MAX_PHOTOS}
                        onSelect={setSelected}
                        onMove={movePhoto}
                        onRemove={removePhoto}
                        onAdd={() => pickInput.current?.click()}
                      />
                    </>
                  )}

                  {kind === 'video' && media && (
                    <video src={media.url} controls playsInline className="w-full max-h-[70vh] rounded-lg bg-black/40" />
                  )}

                  {kind === 'audio' && media && (
                    <div className="flex flex-col items-center gap-4 py-10">
                      <div className="w-40 h-40 rounded-2xl overflow-hidden flex items-center justify-center bg-[hsl(var(--foreground)/0.06)]">
                        {cover ? <img src={cover.url} alt="" className="w-full h-full object-cover" /> : <Music className="w-10 h-10 text-[hsl(var(--muted-foreground))]" strokeWidth={1.25} />}
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-full">{media.file.name}</p>
                      <audio src={media.url} controls className="w-full" />
                    </div>
                  )}

                  {kind === 'poem' && (
                    <textarea
                      aria-label={es ? 'Tu poema' : 'Your poem'}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={es ? 'Escribe aquí tu poema…' : 'Write your poem here…'}
                      className={cn(fieldText, 'resize-none text-center font-serif text-lg leading-relaxed min-h-[45vh] p-4')}
                    />
                  )}

                  {(kind === 'video' || kind === 'audio' || kind === 'poem') && (
                    <div className="flex flex-wrap gap-2">
                      {cover ? (
                        <button type="button" onClick={() => setCover(null)} className="glass-button !min-h-9 !px-3 text-xs">
                          <X className="w-3.5 h-3.5" />{es ? 'Quitar portada' : 'Remove cover'}
                        </button>
                      ) : (
                        <button type="button" onClick={() => coverInput.current?.click()} className="glass-button !min-h-9 !px-3 text-xs">
                          <ImagePlus className="w-3.5 h-3.5" />{es ? 'Añadir portada' : 'Add cover'}
                        </button>
                      )}
                      {kind === 'poem' && (media ? (
                        <button type="button" onClick={() => setMedia(null)} className="glass-button !min-h-9 !px-3 text-xs">
                          <X className="w-3.5 h-3.5" />{es ? 'Quitar recitado' : 'Remove recital'}
                        </button>
                      ) : (
                        <button type="button" onClick={() => audioInput.current?.click()} className="glass-button !min-h-9 !px-3 text-xs">
                          <Mic className="w-3.5 h-3.5" />{es ? 'Añadir recitado' : 'Add recital'}
                        </button>
                      ))}
                    </div>
                  )}

                  {kind === 'poem' && cover && (
                    <img src={cover.url} alt="" className="w-24 h-24 rounded-xl object-cover" />
                  )}
                  {kind === 'poem' && media && <audio src={media.url} controls className="w-full" />}
                  {kind === 'video' && cover && (
                    <img src={cover.url} alt="" className="w-24 h-24 rounded-xl object-cover" />
                  )}
                </div>

                {/* Right: what you say about it */}
                <div className="min-w-0 divide-y divide-[hsl(var(--foreground)/0.1)]">
                  <div className={section}>
                    {profile?.username && <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">@{profile.username}</p>}
                    <input
                      ref={titleInput}
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={200}
                      aria-label={es ? 'Título' : 'Title'}
                      placeholder={es ? 'Ponle un título' : 'Give it a title'}
                      className={cn(fieldText, 'text-xl font-light')}
                    />
                    {kind !== 'poem' && (
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={4}
                        maxLength={5000}
                        aria-label={es ? 'Descripción' : 'Description'}
                        placeholder={es ? 'Cuenta algo sobre esta obra…' : 'Say something about this work…'}
                        className={cn(fieldText, 'mt-3 text-sm resize-none leading-relaxed')}
                      />
                    )}
                  </div>

                  {typeChips.length > 0 && (
                    <div className={cn(section, 'flex flex-wrap gap-2')} role="radiogroup" aria-label={es ? 'Tipo de obra' : 'Type of work'}>
                      {typeChips.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={workType === value}
                          onClick={() => setWorkType(value)}
                          className={cn('glass-button !min-h-9 !px-4', workType === value && 'glass-button--primary')}
                        >
                          {workType === value && <Check className="w-3.5 h-3.5" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {workType === 'cancion' && (
                    <div className={section}>
                      <textarea
                        value={lyrics}
                        onChange={(event) => setLyrics(event.target.value)}
                        rows={6}
                        aria-label={es ? 'Letra' : 'Lyrics'}
                        placeholder={es ? 'Pega aquí la letra…' : 'Paste the lyrics here…'}
                        className={cn(fieldText, 'text-sm resize-none leading-relaxed')}
                      />
                    </div>
                  )}

                  <div className={cn(section, 'flex flex-wrap items-center gap-1.5')}>
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        aria-label={es ? `Quitar #${tag}` : `Remove #${tag}`}
                        onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                        className="work-tag ios-press inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-[hsl(var(--foreground))]"
                      >
                        #{tag}
                        <X className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                    <input
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={handleTagKey}
                      onBlur={commitTag}
                      aria-label={es ? 'Etiquetas' : 'Tags'}
                      placeholder={tags.length ? '' : (es ? 'Añade etiquetas' : 'Add tags')}
                      className={cn(fieldText, 'flex-1 min-w-24 text-sm py-1')}
                    />
                  </div>

                  <SaleRow es={es} isForSale={isForSale} setIsForSale={setIsForSale}>
                    {isForSale && (
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        aria-label={es ? 'Precio en euros' : 'Price in euros'}
                        placeholder={es ? 'Precio (€)' : 'Price (€)'}
                        className={cn(fieldText, 'mt-3 text-sm')}
                      />
                    )}
                  </SaleRow>

                  {error && <p role="alert" className="px-5 py-3 text-sm text-red-500">{error}</p>}
                </div>
              </div>

              {/* While it is on its way */}
              {progress && (
                <div className="upload-progress absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center">
                  {progress.step === 'done'
                    ? <Check className="icon-pop w-10 h-10 text-[hsl(var(--foreground))]" strokeWidth={1.5} />
                    : <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--foreground))]" strokeWidth={1.5} />}
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {progress.step === 'uploading' && (es ? `Subiendo ${Math.min(progress.done + 1, progress.total)} de ${progress.total}…` : `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`)}
                    {progress.step === 'checking' && (es ? 'Comprobando la obra…' : 'Checking the work…')}
                    {progress.step === 'done' && (es ? 'Publicada' : 'Published')}
                  </p>
                  {progress.step === 'uploading' && (
                    <div className="w-48 h-1 rounded-full overflow-hidden bg-[hsl(var(--foreground)/0.15)]">
                      <div className="h-full rounded-full bg-[hsl(var(--foreground))] transition-[width] duration-300 ease-out" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* On small screens the button stays at hand while the page scrolls */}
      {kind && (
        <div className="lg:hidden sticky bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 header-glass">
          <button type="button" onClick={publish} disabled={busy} className="glass-button glass-button--primary w-full">
            {publishLabel}
          </button>
        </div>
      )}
      <Footer />
    </div>
  );
}

function SaleRow({ es, isForSale, setIsForSale, children }: { es: boolean; isForSale: boolean; setIsForSale: (value: boolean) => void; children: ReactNode }) {
  return (
    <div className="px-5 py-4">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-sm text-[hsl(var(--foreground))]">{es ? 'Poner en venta' : 'Put up for sale'}</span>
        <Switch checked={isForSale} onCheckedChange={setIsForSale} />
      </label>
      {children}
    </div>
  );
}
