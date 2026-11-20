import { useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowUpRight, ChevronDown, ChevronUp, Clock, EyeOff, FileText, ImagePlus, Loader2, Mail, MapPin, Pause, Play, Plus, Upload, X,
} from 'lucide-react';
import { smallImage } from '@/lib/small-photo';
import { loadPoemFont, poemFontStyle } from '@/lib/poem-fonts';
import { cn } from '@/lib/utils';
import {
  LIMITS,
  embedOf,
  fileProblem,
  hostOf,
  isEmptySection,
  nameFromFile,
  serviceOf,
  uploadPortfolioFile,
  workPicture,
  type Entry,
  type LinkItem,
  type PortfolioFile,
  type PortfolioInfo,
  type PortfolioWork,
  type Quote,
  type Section,
  type WorkPick,
} from '@/lib/portfolio';

const newId = () => Math.random().toString(36).slice(2, 10);

// ---- Typing right on the page ---------------------------------------------------------

interface FieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
  multiline?: boolean;
  maxLength: number;
  type?: 'text' | 'email' | 'url';
  autoFocus?: boolean;
}

/** A piece of the portfolio that turns into its own text box while editing, in the same letters. */
export function Field({ value, onChange, placeholder, label, className, multiline = false, maxLength, type = 'text', autoFocus }: FieldProps) {
  const box = useRef<HTMLTextAreaElement>(null);
  // It grows with what is written: no scroll bars inside the page.
  useLayoutEffect(() => {
    const area = box.current;
    if (!area) return;
    area.style.height = '0px';
    area.style.height = `${area.scrollHeight}px`;
  }, [value, multiline]);

  if (multiline) {
    return (
      <textarea
        ref={box}
        rows={1}
        value={value}
        maxLength={maxLength}
        aria-label={label}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        className={cn('pf-field pf-field--area', className)}
      />
    );
  }
  return (
    <input
      type={type}
      value={value}
      maxLength={maxLength}
      aria-label={label}
      placeholder={placeholder}
      autoFocus={autoFocus}
      inputMode={type === 'email' ? 'email' : type === 'url' ? 'url' : undefined}
      autoCapitalize={type === 'text' ? 'sentences' : 'none'}
      autoCorrect={type === 'text' ? 'on' : 'off'}
      onChange={(event) => onChange(event.target.value)}
      className={cn('pf-field', className)}
    />
  );
}

/** On or off, with the knob sliding across. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="pf-switch-row tap-area">
      <span className="pf-switch" data-on={on || undefined}><span className="pf-switch-knob" /></span>
      <span>{label}</span>
    </button>
  );
}

function RemoveButton({ onClick, label, className }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn('pf-remove ios-press tap-area', className)}>
      <X className="h-3.5 w-3.5" />
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="pf-add ios-press">
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}

// Lists shrink the row away before it leaves, so nothing vanishes between two frames.
function useLeaving() {
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const leave = (id: string, then: () => void) => {
    setLeaving((current) => new Set(current).add(id));
    window.setTimeout(() => {
      then();
      setLeaving((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, 220);
  };
  return { isLeaving: (id: string) => leaving.has(id), leave };
}

// ---- The top: who they are ----------------------------------------------------------------

interface HeroProps {
  es: boolean;
  editing: boolean;
  name: string;
  avatar: string | null;
  info: PortfolioInfo;
  picture: string | null;
  pictureStatus: 'ok' | 'checking' | 'held';
  onInfo: (change: Partial<PortfolioInfo>) => void;
  onChoosePicture: () => void;
}

export function PortfolioHero({ es, editing, name, avatar, info, picture, pictureStatus, onInfo, onChoosePicture }: HeroProps) {
  const showPicture = !!picture && (editing || pictureStatus === 'ok');
  return (
    <header className="pf-hero" data-has-art={showPicture || undefined}>
      {(showPicture || editing) && (
        <figure className="pf-hero-art" data-empty={!showPicture || undefined}>
          {showPicture ? (
            <img key={picture} {...smallImage(picture)} alt="" className="pf-hero-img"
              // A new cover fades in once it has arrived, instead of popping in half-drawn.
              ref={(element) => { if (element?.complete) element.dataset.ready = ''; }}
              onLoad={(event) => { event.currentTarget.dataset.ready = ''; }} />
          ) : (
            <span className="pf-hero-placeholder">{es ? 'Sin portada' : 'No cover'}</span>
          )}
          {editing && pictureStatus !== 'ok' && showPicture && <MediaBadge es={es} status={pictureStatus} />}
          {editing && (
            <button type="button" onClick={onChoosePicture} className="pf-hero-change glass-bar ios-press">
              <ImagePlus className="h-4 w-4" />
              {es ? 'Cambiar portada' : 'Change cover'}
            </button>
          )}
        </figure>
      )}
      <div className="pf-hero-text">
        <div className="pf-hero-who">
          {avatar && <img src={avatar} alt="" referrerPolicy="no-referrer" className="pf-avatar" />}
          <p className="pf-kicker">Portfolio</p>
        </div>
        <h1 className="pf-name">{name}</h1>
        {editing ? (
          <div className="pf-hero-fields">
            <Field value={info.headline} onChange={(headline) => onInfo({ headline })} maxLength={LIMITS.short} className="pf-headline"
              label={es ? 'Qué eres' : 'What you do'} placeholder={es ? 'Qué eres: «Productora musical», «Pintor»…' : 'What you do: “Music producer”, “Painter”…'} />
            <div className="pf-field-icon">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              <Field value={info.location} onChange={(location) => onInfo({ location })} maxLength={LIMITS.short}
                label={es ? 'Dónde' : 'Where'} placeholder={es ? 'Ciudad (opcional)' : 'City (optional)'} />
            </div>
            <div className="pf-field-icon">
              <Mail aria-hidden="true" className="h-4 w-4" />
              <Field value={info.email} onChange={(email) => onInfo({ email })} maxLength={LIMITS.short} type="email"
                label={es ? 'Correo de contacto' : 'Contact email'} placeholder={es ? 'Correo para que te escriban (opcional)' : 'Email to reach you (optional)'} />
            </div>
            <Switch on={info.available} onChange={(available) => onInfo({ available })} label={es ? 'Disponible para encargos' : 'Open to commissions'} />
          </div>
        ) : (
          <>
            {info.headline && <p className="pf-headline">{info.headline}</p>}
            {(info.location || info.available) && (
              <p className="pf-meta">
                {info.location && <span className="pf-meta-item"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{info.location}</span>}
                {info.available && <span className="pf-available"><span aria-hidden="true" className="pf-available-dot" />{es ? 'Disponible para encargos' : 'Open to commissions'}</span>}
              </p>
            )}
            {info.email && (
              <a href={`mailto:${info.email}`} className="pf-contact ios-press">
                <Mail className="h-4 w-4" />
                {es ? 'Contactar' : 'Get in touch'}
                <span className="pf-print-only">· {info.email}</span>
              </a>
            )}
          </>
        )}
      </div>
    </header>
  );
}

function MediaBadge({ es, status }: { es: boolean; status: 'checking' | 'held' }) {
  return (
    <span className="pf-badge" data-held={status === 'held' || undefined}>
      {status === 'checking' ? <Clock className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {status === 'checking'
        ? (es ? 'Revisando… aún no lo ven los demás' : 'Checking… others cannot see it yet')
        : (es ? 'No se muestra: la revisión automática lo ha parado' : 'Not shown: the automatic check stopped it')}
    </span>
  );
}

// ---- Each kind of part ------------------------------------------------------------------

export interface SectionProps {
  es: boolean;
  editing: boolean;
  section: Section;
  update: (change: (section: Section) => Section) => void;
  works: Map<string, PortfolioWork>;
  onPickWorks: () => void;
  mediaStatus: (url: string) => 'ok' | 'checking' | 'held';
  userId: string | null;
}

export function SectionBody(props: SectionProps) {
  const { section } = props;
  switch (section.type) {
    case 'about':
    case 'text':
      return <TextBody {...props} />;
    case 'works':
      return <WorksBody {...props} />;
    case 'entries':
      return <EntriesBody {...props} />;
    case 'files':
      return <FilesBody {...props} />;
    case 'links':
      return <LinksBody {...props} />;
    case 'quotes':
      return <QuotesBody {...props} />;
    default:
      return null;
  }
}

export { isEmptySection };

function TextBody({ es, editing, section, update }: SectionProps) {
  if (section.type !== 'about' && section.type !== 'text') return null;
  if (!editing) return <div className="pf-prose">{section.text}</div>;
  return (
    <Field
      multiline
      value={section.text}
      maxLength={LIMITS.text}
      onChange={(text) => update((current) => ({ ...current, text } as Section))}
      label={section.title}
      className="pf-prose"
      placeholder={section.type === 'about'
        ? (es ? 'Quién eres, qué haces y qué buscas con tu obra. Tres o cuatro frases bastan.' : 'Who you are, what you make and what you are after. Three or four sentences are enough.')
        : (es ? 'Escribe aquí…' : 'Write here…')}
    />
  );
}

function WorkTile({ work, note, es }: { work: PortfolioWork; note: string; es: boolean }) {
  const picture = workPicture(work);
  const isPoem = work.work_type === 'poema';
  useLayoutEffect(() => { if (isPoem && work.poem_font) loadPoemFont(work.poem_font); }, [isPoem, work.poem_font]);
  return (
    <>
      <span className="pf-work-art">
        {picture ? (
          <img {...smallImage(picture)} alt={work.title} loading="lazy" decoding="async" />
        ) : isPoem ? (
          <span className="pf-work-poem" style={work.poem_font ? poemFontStyle(work.poem_font, 0.8) : undefined}>{work.description}</span>
        ) : (
          <span className="pf-work-blank">{work.work_type === 'cancion' ? (es ? 'Canción' : 'Song') : work.work_type === 'video' ? 'Vídeo' : work.title}</span>
        )}
      </span>
      <span className="pf-work-caption">
        <span className="pf-work-title">{work.title}</span>
        {note && <span className="pf-work-note">{note}</span>}
      </span>
    </>
  );
}

function WorksBody({ es, editing, section, update, works, onPickWorks }: SectionProps) {
  const { isLeaving, leave } = useLeaving();
  if (section.type !== 'works') return null;
  const shown = section.items.filter((item) => works.has(item.id));
  const setItems = (change: (items: WorkPick[]) => WorkPick[]) =>
    update((current) => (current.type === 'works' ? { ...current, items: change(current.items) } : current));

  return (
    <div className="pf-works">
      {shown.map((item) => {
        const work = works.get(item.id)!;
        // One shape in both modes, so the pictures stay put (no reload, no jump) when switching.
        return (
          <div key={item.id} className={cn('pf-work pf-item', !editing && 'pf-work--link')} data-leaving={isLeaving(item.id) || undefined}>
            <div className="relative flex flex-col gap-[10px]">
              <WorkTile work={work} note={editing ? '' : item.note} es={es} />
              {editing ? (
                <RemoveButton className="pf-remove--corner" label={es ? `Quitar «${work.title}»` : `Remove “${work.title}”`}
                  onClick={() => leave(item.id, () => setItems((items) => items.filter((it) => it.id !== item.id)))} />
              ) : (
                <Link to={`/work/${work.id}`} className="pf-work-cover" aria-label={work.title} />
              )}
            </div>
            {editing && (
              <Field value={item.note} maxLength={LIMITS.line} className="pf-work-note-field"
                label={es ? `Detalles de «${work.title}»` : `Details of “${work.title}”`}
                placeholder={es ? 'Año · técnica · medidas' : 'Year · medium · size'}
                onChange={(note) => setItems((items) => items.map((it) => (it.id === item.id ? { ...it, note } : it)))} />
            )}
          </div>
        );
      })}
      {editing && (
        <button type="button" onClick={onPickWorks} className="pf-work-add ios-press">
          <Plus className="h-5 w-5" />
          {shown.length ? (es ? 'Elegir obras' : 'Choose works') : (es ? 'Elige obras de tu perfil' : 'Choose works from your profile')}
        </button>
      )}
    </div>
  );
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function EntriesBody({ es, editing, section, update }: SectionProps) {
  const { isLeaving, leave } = useLeaving();
  const [fresh, setFresh] = useState<string | null>(null);
  if (section.type !== 'entries') return null;
  const setItems = (change: (items: Entry[]) => Entry[]) =>
    update((current) => (current.type === 'entries' ? { ...current, items: change(current.items) } : current));
  const edit = (id: string, change: Partial<Entry>) => setItems((items) => items.map((it) => (it.id === id ? { ...it, ...change } : it)));

  if (!editing) {
    return (
      <ul className="pf-entries">
        {section.items.map((entry) => (
          <li key={entry.id} className="pf-entry">
            <span className="pf-year">{entry.year}</span>
            <div className="min-w-0">
              <p className="pf-entry-title">
                {entry.link ? (
                  <a href={entry.link} target="_blank" rel="noopener noreferrer nofollow ugc" className="pf-entry-link">
                    {entry.title || hostOf(entry.link)}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                ) : entry.title}
              </p>
              {entry.detail && <p className="pf-entry-detail">{entry.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="pf-edit-list">
      {/* The newest goes first, as in any CV. */}
      <AddButton onClick={() => {
        const id = newId();
        setFresh(id);
        setItems((items) => [{ id, year: String(new Date().getFullYear()), title: '', detail: '', link: '' }, ...items]);
      }}>
        {es ? 'Añadir' : 'Add'}
      </AddButton>
      {section.items.map((entry, index) => (
        <div key={entry.id} className="pf-entry-edit pf-item" data-leaving={isLeaving(entry.id) || undefined}>
          <Field value={entry.year} onChange={(year) => edit(entry.id, { year })} maxLength={20} className="pf-year"
            label={es ? 'Año' : 'Year'} placeholder={es ? 'Año' : 'Year'} />
          <div className="pf-entry-fields">
            <Field value={entry.title} onChange={(title) => edit(entry.id, { title })} maxLength={LIMITS.line} className="pf-entry-title"
              autoFocus={fresh === entry.id} label={es ? 'Título' : 'Title'} placeholder={es ? 'Título: la exposición, el tema, el premio…' : 'Title: the show, the track, the award…'} />
            <Field value={entry.detail} onChange={(detail) => edit(entry.id, { detail })} maxLength={LIMITS.line} className="pf-entry-detail"
              label={es ? 'Detalle' : 'Detail'} placeholder={es ? 'Dónde, con quién o tu papel' : 'Where, with whom or your role'} />
            <Field value={entry.link} onChange={(link) => edit(entry.id, { link })} maxLength={LIMITS.url} type="url" className="pf-entry-url"
              label={es ? 'Enlace' : 'Link'} placeholder={es ? 'Enlace (opcional)' : 'Link (optional)'} />
          </div>
          <div className="pf-row-tools">
            <button type="button" className="pf-tool ios-press tap-area" disabled={index === 0} aria-label={es ? 'Subir' : 'Move up'}
              onClick={() => setItems((items) => move(items, index, index - 1))}><ChevronUp className="h-4 w-4" /></button>
            <button type="button" className="pf-tool ios-press tap-area" disabled={index === section.items.length - 1} aria-label={es ? 'Bajar' : 'Move down'}
              onClick={() => setItems((items) => move(items, index, index + 1))}><ChevronDown className="h-4 w-4" /></button>
            <RemoveButton label={es ? 'Quitar' : 'Remove'} onClick={() => leave(entry.id, () => setItems((items) => items.filter((it) => it.id !== entry.id)))} />
          </div>
        </div>
      ))}
    </div>
  );
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** A track to listen to right there: one plays at a time, the bar can be dragged, the length shows before playing. */
function TrackPlayer({ file, es, bare = false }: { file: PortfolioFile; es: boolean; bare?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const title = file.name || (es ? 'Tema' : 'Track');

  const toggle = () => {
    const player = audio.current;
    if (!player) return;
    if (player.paused) {
      document.querySelectorAll('audio, video').forEach((other) => { if (other !== player) (other as HTMLMediaElement).pause(); });
      player.play().catch(() => toast.error(es ? 'No se ha podido reproducir.' : 'Could not play it.'));
    } else player.pause();
  };

  return (
    <div className="pf-track" data-playing={playing || undefined}>
      <button type="button" onClick={toggle} className="pf-track-play ios-press"
        aria-label={playing ? (es ? `Pausar «${title}»` : `Pause “${title}”`) : (es ? `Escuchar «${title}»` : `Play “${title}”`)}>
        <span className="pf-track-icon" data-on={!playing || undefined}><Play className="h-4 w-4 translate-x-[1px]" fill="currentColor" /></span>
        <span className="pf-track-icon" data-on={playing || undefined}><Pause className="h-4 w-4" fill="currentColor" /></span>
      </button>
      <div className="pf-track-main">
        {!bare && (
          <p className="pf-track-title">
            <span className="pf-file-name">{title}</span>
            {file.note && <span className="pf-file-note">{file.note}</span>}
          </p>
        )}
        <div className="pf-track-row">
          <input type="range" className="pf-track-bar" min={0} max={length || 0} step={0.1} value={Math.min(time, length || 0)}
            aria-label={es ? 'Posición' : 'Position'} disabled={!length}
            style={{ '--pf-progress': `${length ? (time / length) * 100 : 0}%` } as CSSProperties}
            onChange={(event) => {
              const at = Number(event.target.value);
              if (audio.current) audio.current.currentTime = at;
              setTime(at);
            }} />
          <span className="pf-track-time">{clock(time)} / {clock(length)}</span>
        </div>
      </div>
      <audio ref={audio} preload="metadata" src={file.url}
        onLoadedMetadata={(event) => setLength(event.currentTarget.duration)}
        onDurationChange={(event) => setLength(event.currentTarget.duration)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={(event) => { setPlaying(false); event.currentTarget.currentTime = 0; setTime(0); }} />
    </div>
  );
}

function FileView({ file, es, bare = false }: { file: PortfolioFile; es: boolean; bare?: boolean }) {
  if (file.kind === 'audio') return <TrackPlayer file={file} es={es} bare={bare} />;
  if (file.kind === 'video') {
    return (
      <div className="pf-video">
        <video controls playsInline preload="metadata" src={`${file.url}#t=0.1`} />
        {(file.name || file.note) && (
          <p className="pf-file-caption"><span className="pf-file-name">{file.name}</span>{file.note && <span className="pf-file-note"> · {file.note}</span>}</p>
        )}
      </div>
    );
  }
  if (file.kind === 'pdf') {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="pf-pdf ios-press">
        <FileText aria-hidden="true" className="h-6 w-6 shrink-0" />
        <span className="min-w-0">
          <span className="pf-file-name">{file.name || 'PDF'}</span>
          {file.note && <span className="pf-file-note">{file.note}</span>}
        </span>
        <ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0" />
      </a>
    );
  }
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer" className="pf-photo">
      <img {...smallImage(file.url)} alt={file.name} loading="lazy" decoding="async" />
      {(file.name || file.note) && <span className="pf-file-caption"><span className="pf-file-name">{file.name}</span>{file.note && <span className="pf-file-note"> · {file.note}</span>}</span>}
    </a>
  );
}

interface Pending { id: string; name: string }

function FilesBody({ es, editing, section, update, mediaStatus, userId }: SectionProps) {
  const { isLeaving, leave } = useLeaving();
  const [pending, setPending] = useState<Pending[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const order = useRef(new Map<string, number>());
  if (section.type !== 'files') return null;
  const setItems = (change: (items: PortfolioFile[]) => PortfolioFile[]) =>
    update((current) => (current.type === 'files' ? { ...current, items: change(current.items) } : current));

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!userId) return;
    const room = LIMITS.files - section.items.length - pending.length;
    if (files.length > room) toast.error(es ? `Caben ${LIMITS.files} archivos en total.` : `There is room for ${LIMITS.files} files in all.`);
    for (const file of files.slice(0, Math.max(room, 0))) {
      const problem = fileProblem(file);
      if (problem) {
        toast.error(problem === 'type'
          ? (es ? `«${file.name}» no vale: sube audio, vídeo, fotos o PDF.` : `“${file.name}” cannot go in: upload audio, video, photos or PDF.`)
          : (es ? `«${file.name}» pesa demasiado (máximo: audio 20 MB, vídeo 25 MB, PDF 10 MB).` : `“${file.name}” is too big (max: audio 20 MB, video 25 MB, PDF 10 MB).`));
        continue;
      }
      const id = newId();
      order.current.set(id, order.current.size);
      setPending((current) => [...current, { id, name: nameFromFile(file) }]);
      uploadPortfolioFile(file, userId)
        // Whatever finishes first, the files keep the order they were chosen in.
        .then(({ url, kind }) => setItems((items) => {
          const next = [...items, { id, url, kind, name: nameFromFile(file), note: '' }];
          const rank = (item: PortfolioFile) => order.current.get(item.id);
          const from = next.findIndex((item) => rank(item) !== undefined);
          if (from < 0) return next;
          const tail = next.slice(from).sort((a, b) => (rank(a) ?? Infinity) - (rank(b) ?? Infinity));
          return [...next.slice(0, from), ...tail];
        }))
        .catch(() => toast.error(es ? `No se ha podido subir «${file.name}». Inténtalo otra vez.` : `“${file.name}” could not be uploaded. Please try again.`))
        .finally(() => setPending((current) => current.filter((item) => item.id !== id)));
    }
  };

  if (!editing) {
    const photos = section.items.filter((file) => file.kind === 'image');
    const rest = section.items.filter((file) => file.kind !== 'image');
    return (
      <div className="pf-files">
        {rest.map((file) => <FileView key={file.id} file={file} es={es} />)}
        {photos.length > 0 && <div className="pf-photos">{photos.map((file) => <FileView key={file.id} file={file} es={es} />)}</div>}
      </div>
    );
  }

  return (
    <div className="pf-edit-list">
      {section.items.map((file) => {
        const status = file.kind === 'image' || file.kind === 'video' ? mediaStatus(file.url) : 'ok';
        return (
          <div key={file.id} className="pf-file-edit pf-item" data-leaving={isLeaving(file.id) || undefined}>
            <div className="pf-file-edit-head">
              <Field value={file.name} onChange={(name) => setItems((items) => items.map((it) => (it.id === file.id ? { ...it, name } : it)))}
                maxLength={LIMITS.short} className="pf-file-name" label={es ? 'Nombre' : 'Name'} placeholder={es ? 'Nombre' : 'Name'} />
              <RemoveButton label={es ? 'Quitar archivo' : 'Remove file'} onClick={() => leave(file.id, () => setItems((items) => items.filter((it) => it.id !== file.id)))} />
            </div>
            <Field value={file.note} onChange={(note) => setItems((items) => items.map((it) => (it.id === file.id ? { ...it, note } : it)))}
              maxLength={LIMITS.line} className="pf-file-note" label={es ? 'Nota' : 'Note'}
              placeholder={file.kind === 'audio' ? (es ? 'Tu papel: producción, mezcla… (opcional)' : 'Your role: production, mix… (optional)') : (es ? 'Una nota (opcional)' : 'A note (optional)')} />
            {status !== 'ok' && <MediaBadge es={es} status={status} />}
            <FileView file={{ ...file, name: '', note: '' }} es={es} bare />
          </div>
        );
      })}
      {pending.map((item) => (
        <div key={item.id} className="pf-file-edit pf-file-edit--pending pf-item">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="truncate">{es ? `Subiendo «${item.name}»…` : `Uploading “${item.name}”…`}</span>
        </div>
      ))}
      <input ref={picker} type="file" multiple hidden accept="audio/*,video/*,image/*,application/pdf,.heic,.heif" onChange={addFiles} />
      <button type="button" onClick={() => picker.current?.click()} className="pf-add ios-press">
        <Upload className="h-4 w-4" />
        {es ? 'Añadir archivos' : 'Add files'}
        <span className="pf-add-hint">{es ? 'Audio, vídeo, fotos o PDF' : 'Audio, video, photos or PDF'}</span>
      </button>
    </div>
  );
}

function LinksBody({ es, editing, section, update }: SectionProps) {
  const { isLeaving, leave } = useLeaving();
  const [fresh, setFresh] = useState<string | null>(null);
  if (section.type !== 'links') return null;
  const setItems = (change: (items: LinkItem[]) => LinkItem[]) =>
    update((current) => (current.type === 'links' ? { ...current, items: change(current.items) } : current));

  if (!editing) {
    return (
      <div className="pf-links">
        {section.items.map((link) => {
          const embed = embedOf(link.url);
          return (
            <div key={link.id} className="pf-link-block">
              <a href={link.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="pf-link ios-press">
                <span className="pf-link-name">{link.label || serviceOf(link.url)}</span>
                <span className="pf-link-host">{hostOf(link.url)}</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </a>
              {embed && (
                <iframe
                  title={link.label || serviceOf(link.url)}
                  src={embed.src}
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  className="pf-embed"
                  data-kind={embed.src.includes('spotify') ? (embed.tall ? 'spotify-tall' : 'spotify') : 'video'}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="pf-edit-list">
      {section.items.map((link) => (
        <div key={link.id} className="pf-link-edit pf-item" data-leaving={isLeaving(link.id) || undefined}>
          <div className="pf-entry-fields">
            <Field value={link.url} type="url" maxLength={LIMITS.url} autoFocus={fresh === link.id} className="pf-link-url"
              onChange={(url) => setItems((items) => items.map((it) => (it.id === link.id ? { ...it, url } : it)))}
              label={es ? 'Enlace' : 'Link'} placeholder={es ? 'Pega el enlace: Spotify, YouTube, tu web…' : 'Paste the link: Spotify, YouTube, your site…'} />
            <Field value={link.label} maxLength={LIMITS.short} className="pf-link-label"
              onChange={(label) => setItems((items) => items.map((it) => (it.id === link.id ? { ...it, label } : it)))}
              label={es ? 'Nombre' : 'Name'} placeholder={link.url ? serviceOf(link.url) : (es ? 'Nombre (opcional)' : 'Name (optional)')} />
          </div>
          <RemoveButton label={es ? 'Quitar enlace' : 'Remove link'} onClick={() => leave(link.id, () => setItems((items) => items.filter((it) => it.id !== link.id)))} />
        </div>
      ))}
      <AddButton onClick={() => {
        const id = newId();
        setFresh(id);
        setItems((items) => [...items, { id, url: '', label: '' }]);
      }}>
        {es ? 'Añadir enlace' : 'Add link'}
      </AddButton>
    </div>
  );
}

function QuotesBody({ es, editing, section, update }: SectionProps) {
  const { isLeaving, leave } = useLeaving();
  const [fresh, setFresh] = useState<string | null>(null);
  if (section.type !== 'quotes') return null;
  const setItems = (change: (items: Quote[]) => Quote[]) =>
    update((current) => (current.type === 'quotes' ? { ...current, items: change(current.items) } : current));

  if (!editing) {
    return (
      <div className="pf-quotes">
        {section.items.map((quote) => (
          <figure key={quote.id} className="pf-quote">
            <blockquote>{quote.text}</blockquote>
            {quote.source && <figcaption>— {quote.source}</figcaption>}
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="pf-edit-list">
      {section.items.map((quote) => (
        <div key={quote.id} className="pf-quote-edit pf-item" data-leaving={isLeaving(quote.id) || undefined}>
          <div className="pf-entry-fields">
            <Field multiline value={quote.text} maxLength={LIMITS.quote} autoFocus={fresh === quote.id} className="pf-quote-text"
              onChange={(text) => setItems((items) => items.map((it) => (it.id === quote.id ? { ...it, text } : it)))}
              label={es ? 'Cita' : 'Quote'} placeholder={es ? 'Lo que dijeron de ti' : 'What they said about you'} />
            <Field value={quote.source} maxLength={LIMITS.short} className="pf-quote-source"
              onChange={(source) => setItems((items) => items.map((it) => (it.id === quote.id ? { ...it, source } : it)))}
              label={es ? 'Quién lo dijo' : 'Who said it'} placeholder={es ? 'Quién lo dijo: medio o persona' : 'Who said it: outlet or person'} />
          </div>
          <RemoveButton label={es ? 'Quitar cita' : 'Remove quote'} onClick={() => leave(quote.id, () => setItems((items) => items.filter((it) => it.id !== quote.id)))} />
        </div>
      ))}
      <AddButton onClick={() => {
        const id = newId();
        setFresh(id);
        setItems((items) => [...items, { id, text: '', source: '' }]);
      }}>
        {es ? 'Añadir cita' : 'Add quote'}
      </AddButton>
    </div>
  );
}
