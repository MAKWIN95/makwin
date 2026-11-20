import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  AlignLeft, BookOpen, Check, Copy, Download, Eye, FileUp, Globe, Images, Link2, ListOrdered, Loader2, Lock,
  Quote as QuoteIcon, RefreshCw, Share2, Trash2, Upload,
} from 'lucide-react';
import Segmented from '@/components/Segmented';
import Reveal from '@/components/Reveal';
import { smallImage } from '@/lib/small-photo';
import { cn } from '@/lib/utils';
import PortfolioSheet from './PortfolioSheet';
import {
  ACCENTS,
  ACCENT_LABELS,
  SECTION_INFO,
  STYLES,
  TONES,
  TONE_LABELS,
  fileProblem,
  uploadPortfolioFile,
  workPicture,
  type PortfolioDesign,
  type PortfolioVisibility,
  type PortfolioWork,
  type SectionType,
} from '@/lib/portfolio';

const close = (es: boolean) => (es ? 'Cerrar' : 'Close');

// ---- How it looks --------------------------------------------------------------------

const STYLE_TEXT: Record<(typeof STYLES)[number], { es: string; en: string; aboutEs: string; aboutEn: string }> = {
  clasico: { es: 'Clásico', en: 'Classic', aboutEs: 'Serif y calma, como un catálogo', aboutEn: 'Serif and calm, like a catalogue' },
  galeria: { es: 'Galería', en: 'Gallery', aboutEs: 'Las obras grandes, casi sin texto', aboutEn: 'Big works, barely any text' },
  moderno: { es: 'Moderno', en: 'Modern', aboutEs: 'Directo y rotundo, como un cartel', aboutEn: 'Direct and bold, like a poster' },
};

export function DesignSheet({ es, design, onChange, onClose }: { es: boolean; design: PortfolioDesign; onChange: (design: PortfolioDesign) => void; onClose: () => void }) {
  return (
    <PortfolioSheet title={es ? 'Diseño' : 'Design'} lead={es ? 'Cambia al momento. Todo combina con todo.' : 'Changes at once. Everything goes with everything.'} closeLabel={close(es)} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div role="radiogroup" aria-label={es ? 'Estilo' : 'Style'} className="grid grid-cols-3 gap-2">
          {STYLES.map((style) => (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={design.style === style}
              onClick={() => onChange({ ...design, style })}
              className="pf-style-card ios-press"
              data-style={style}
            >
              <span className="pf-style-sample" aria-hidden="true">
                <span className="pf-style-sample-art" />
                <span className="pf-style-sample-title">Aa</span>
                <span className="pf-style-sample-line" />
              </span>
              <span className="pf-style-name">{es ? STYLE_TEXT[style].es : STYLE_TEXT[style].en}</span>
              <span className="pf-style-about">{es ? STYLE_TEXT[style].aboutEs : STYLE_TEXT[style].aboutEn}</span>
            </button>
          ))}
        </div>

        <div>
          <p className="pf-sheet-label">{es ? 'Fondo' : 'Background'}</p>
          <div role="radiogroup" aria-label={es ? 'Fondo' : 'Background'} className="pf-tones">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={design.tone === tone}
                onClick={() => onChange({ ...design, tone })}
                className="pf-tone ios-press"
              >
                <span className="pf-tone-sample" data-tone={tone} data-accent={design.accent} aria-hidden="true">
                  <span className="pf-tone-aa">Aa</span>
                  <span className="pf-tone-dot" />
                </span>
                <span className="pf-tone-name">{es ? TONE_LABELS[tone].es : TONE_LABELS[tone].en}</span>
              </button>
            ))}
          </div>
          <p className="pf-sheet-hint">{es ? 'El PDF sale con el mismo fondo.' : 'The PDF comes out with the same background.'}</p>
        </div>

        <div>
          <p className="pf-sheet-label">{es ? 'Color' : 'Colour'}</p>
          <div role="radiogroup" aria-label={es ? 'Color' : 'Colour'} className="flex flex-wrap gap-3">
            {ACCENTS.map((accent) => (
              <button
                key={accent}
                type="button"
                role="radio"
                aria-checked={design.accent === accent}
                aria-label={es ? ACCENT_LABELS[accent].es : ACCENT_LABELS[accent].en}
                title={es ? ACCENT_LABELS[accent].es : ACCENT_LABELS[accent].en}
                onClick={() => onChange({ ...design, accent })}
                className="pf-swatch ios-press tap-area"
                data-accent={accent}
              >
                <Check className="pf-swatch-check h-4 w-4" strokeWidth={3} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </PortfolioSheet>
  );
}

// ---- Who can see it, and how to send it ----------------------------------------------------

interface ShareProps {
  es: boolean;
  visibility: PortfolioVisibility;
  link: string;
  onVisibility: (visibility: PortfolioVisibility) => void;
  onRenewKey: () => Promise<void>;
  onPrint: () => void;
  onPreview: () => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

const VISIBILITY_TEXT: Record<PortfolioVisibility, { es: string; en: string }> = {
  private: { es: 'Solo tú lo ves. Prepáralo con calma.', en: 'Only you can see it. Take your time.' },
  link: { es: 'Lo ve quien tenga el enlace: ideal para mandarlo a una galería, un sello o un cliente. No sale en tu perfil.', en: 'Anyone with the link can see it: ideal for a gallery, a label or a client. It does not show on your profile.' },
  public: { es: 'Lo ve todo el mundo, también desde tu perfil.', en: 'Everyone can see it, from your profile too.' },
};

export function ShareSheet({ es, visibility, link, onVisibility, onRenewKey, onPrint, onPreview, onDelete, onClose }: ShareProps) {
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const shared = visibility !== 'private';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(es ? 'No se ha podido copiar. Mantén pulsado el enlace para copiarlo.' : 'Could not copy. Press and hold the link to copy it.');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: es ? 'Mi portfolio' : 'My portfolio', url: link });
    } catch {
      // Closing the share window is not a mistake.
    }
  };

  return (
    <PortfolioSheet title={es ? 'Compartir' : 'Share'} closeLabel={close(es)} onClose={onClose}>
      {(closeSheet) => (
        <div className="flex flex-col gap-5">
          <div>
            <Segmented
              label={es ? 'Quién lo ve' : 'Who can see it'}
              value={visibility}
              onChange={onVisibility}
              className="segmented--snug"
              options={[
                { value: 'private', label: <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />{es ? 'Solo yo' : 'Only me'}</span> },
                { value: 'link', label: <span className="inline-flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />{es ? 'Con enlace' : 'With link'}</span> },
                { value: 'public', label: <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{es ? 'Público' : 'Public'}</span> },
              ]}
            />
            <p key={visibility} className="pf-fade-in mt-2.5 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              {es ? VISIBILITY_TEXT[visibility].es : VISIBILITY_TEXT[visibility].en}
            </p>
          </div>

          <Reveal open={shared}>
            <div className="flex flex-col gap-2.5 pb-px">
              <div className="pf-share-link">
                <span className="truncate" title={link}>{link.replace(/^https?:\/\//, '')}</span>
                <button type="button" onClick={copy} className="pf-share-copy ios-press" aria-live="polite">
                  {copied ? <Check key="done" className="icon-pop h-4 w-4" /> : <Copy key="copy" className="h-4 w-4" />}
                  {copied ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar' : 'Copy')}
                </button>
              </div>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button type="button" onClick={share} className="glass-button glass-button--primary w-full">
                  <Share2 className="h-4 w-4" />{es ? 'Enviar' : 'Send'}
                </button>
              )}
              {visibility === 'link' && (
                <button
                  type="button"
                  disabled={renewing}
                  onClick={async () => {
                    setRenewing(true);
                    try {
                      await onRenewKey();
                      toast.success(es ? 'Enlace nuevo listo. El anterior ya no funciona.' : 'New link ready. The old one no longer works.');
                    } catch {
                      toast.error(es ? 'No se ha podido cambiar el enlace.' : 'The link could not be changed.');
                    } finally {
                      setRenewing(false);
                    }
                  }}
                  className="pf-quiet-button ios-press"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', renewing && 'animate-spin')} />
                  {es ? 'Crear un enlace nuevo (el anterior dejará de funcionar)' : 'Make a new link (the old one stops working)'}
                </button>
              )}
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { closeSheet(); window.setTimeout(onPreview, 230); }} className="glass-button">
              <Eye className="h-4 w-4" />{es ? 'Vista previa' : 'Preview'}
            </button>
            <button type="button" onClick={() => { closeSheet(); window.setTimeout(onPrint, 260); }} className="glass-button">
              <Download className="h-4 w-4" />{es ? 'Descargar PDF' : 'Download PDF'}
            </button>
          </div>
          <p className="-mt-3 text-center text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {es ? 'Para las galerías y convocatorias que lo piden en PDF. Elige «Guardar como PDF».' : 'For galleries and open calls that ask for a PDF. Choose “Save as PDF”.'}
          </p>

          <div className="border-t border-[hsl(var(--foreground)/0.08)] pt-4">
            <div className="discard-morph-host flex justify-center">
              {!confirmDelete ? (
                <button key="ask" type="button" onClick={() => setConfirmDelete(true)} className="pf-quiet-button pf-quiet-button--danger ios-press pf-fade-in">
                  <Trash2 className="h-3.5 w-3.5" />{es ? 'Borrar portfolio' : 'Delete portfolio'}
                </button>
              ) : (
                <div key="sure" className="pf-fade-in flex w-full flex-col items-center gap-2">
                  <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                    {es ? 'Se borra el portfolio. Tus obras y tu perfil se quedan como están.' : 'The portfolio is deleted. Your works and profile stay as they are.'}
                  </p>
                  <div className="grid w-full grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="glass-button">{es ? 'Cancelar' : 'Cancel'}</button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await onDelete();
                        } catch {
                          setDeleting(false);
                          toast.error(es ? 'No se ha podido borrar. Inténtalo otra vez.' : 'Could not delete. Please try again.');
                        }
                      }}
                      className="glass-button glass-button--danger"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {es ? 'Borrar' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PortfolioSheet>
  );
}

// ---- Adding a part ------------------------------------------------------------------------

const SECTION_ICONS: Record<SectionType, typeof AlignLeft> = {
  about: BookOpen, works: Images, entries: ListOrdered, files: FileUp, links: Link2, quotes: QuoteIcon, text: AlignLeft,
};
const ADDABLE: SectionType[] = ['works', 'entries', 'files', 'links', 'quotes', 'text', 'about'];

export function AddSectionSheet({ es, onAdd, onClose }: { es: boolean; onAdd: (type: SectionType) => void; onClose: () => void }) {
  return (
    <PortfolioSheet title={es ? 'Añadir una parte' : 'Add a part'} closeLabel={close(es)} onClose={onClose}>
      {(closeSheet) => (
        <div className="flex flex-col gap-1.5">
          {ADDABLE.map((type) => {
            const Icon = SECTION_ICONS[type];
            const info = SECTION_INFO[type];
            return (
              <button key={type} type="button" onClick={() => { onAdd(type); closeSheet(); }} className="pf-option ios-press">
                <span className="pf-option-icon"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm text-[hsl(var(--foreground))]">{es ? info.es : info.en}</span>
                  <span className="block text-xs text-[hsl(var(--muted-foreground))]">{es ? info.aboutEs : info.aboutEn}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </PortfolioSheet>
  );
}

// ---- Choosing works ---------------------------------------------------------------------

function WorkThumb({ work }: { work: PortfolioWork }) {
  const picture = workPicture(work);
  if (picture) return <img {...smallImage(picture)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />;
  const poem = work.work_type === 'poema' && work.description;
  // A poem shows its first lines, a song or video its kind, so each tile is recognisable.
  return (
    <span className="flex h-full w-full flex-col justify-between gap-1 p-2.5 text-left">
      <span className="line-clamp-5 whitespace-pre-line pr-6 text-[10.5px] leading-snug text-[hsl(var(--foreground)/0.8)]">
        {poem || (work.work_type === 'cancion' ? '♪' : work.work_type === 'video' ? '▶' : '')}
      </span>
      <span className="truncate text-[11px] font-medium text-[hsl(var(--muted-foreground))]">{work.title}</span>
    </span>
  );
}

export function WorkPickerSheet({ es, works, chosen, onDone, onClose }: { es: boolean; works: PortfolioWork[]; chosen: string[]; onDone: (ids: string[]) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<string[]>(chosen.filter((id) => works.some((work) => work.id === id)));
  const toggle = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((it) => it !== id) : [...current, id]));

  return (
    <PortfolioSheet
      wide
      title={es ? 'Elige obras' : 'Choose works'}
      lead={es ? 'Se muestran en el orden en que las tocas.' : 'They show in the order you tap them.'}
      closeLabel={close(es)}
      onClose={onClose}
    >
      {(closeSheet) => (
        <>
          {works.length === 0 ? (
            <p className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
              {es ? 'Aún no tienes obras publicadas. Sube una y aparecerá aquí.' : 'You have no published works yet. Upload one and it will appear here.'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {works.map((work) => {
                const order = picked.indexOf(work.id);
                return (
                  <button
                    key={work.id}
                    type="button"
                    aria-pressed={order >= 0}
                    aria-label={work.title}
                    onClick={() => toggle(work.id)}
                    className="pf-pick thumb-press"
                    data-picked={order >= 0 || undefined}
                  >
                    <WorkThumb work={work} />
                    <span className="pf-pick-mark">{order >= 0 && <span key={order} className="icon-pop">{order + 1}</span>}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" onClick={() => { onDone(picked); closeSheet(); }} className="mt-5 w-full glass-button glass-button--primary">
            {es ? `Listo${picked.length ? ` · ${picked.length}` : ''}` : `Done${picked.length ? ` · ${picked.length}` : ''}`}
          </button>
        </>
      )}
    </PortfolioSheet>
  );
}

// ---- The cover picture ------------------------------------------------------------------

interface CoverProps {
  es: boolean;
  works: PortfolioWork[];
  userId: string;
  current: { work: string | null; image: string | null };
  onChoose: (choice: { work: string | null; image: string | null }) => void;
  onClose: () => void;
}

export function CoverSheet({ es, works, userId, current, onChoose, onClose }: CoverProps) {
  const withPicture = works.filter((work) => workPicture(work));
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  return (
    <PortfolioSheet wide title={es ? 'Portada' : 'Cover'} lead={es ? 'La imagen grande de arriba.' : 'The big picture at the top.'} closeLabel={close(es)} onClose={onClose}>
      {(closeSheet) => {
        const choose = (choice: { work: string | null; image: string | null }) => { onChoose(choice); closeSheet(); };
        const upload = async (event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          if (fileProblem(file) || !/^image\//.test(file.type || 'image/heic')) {
            toast.error(es ? 'Elige una foto.' : 'Choose a photo.');
            return;
          }
          setUploading(true);
          try {
            const { url } = await uploadPortfolioFile(file, userId);
            choose({ work: null, image: url });
          } catch {
            toast.error(es ? 'No se ha podido subir la foto. Inténtalo otra vez.' : 'The photo could not be uploaded. Please try again.');
          } finally {
            setUploading(false);
          }
        };
        return (
          <>
            {withPicture.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {withPicture.map((work) => (
                  <button key={work.id} type="button" aria-label={work.title} aria-pressed={current.work === work.id}
                    onClick={() => choose({ work: work.id, image: null })} className="pf-pick thumb-press" data-picked={current.work === work.id || undefined}>
                    <WorkThumb work={work} />
                    <span className="pf-pick-mark">{current.work === work.id && <Check className="icon-pop h-3.5 w-3.5" strokeWidth={3} />}</span>
                  </button>
                ))}
              </div>
            )}
            <input ref={picker} type="file" hidden accept="image/*,.heic,.heif" onChange={upload} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={uploading} onClick={() => picker.current?.click()} className="glass-button glass-button--primary">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {es ? 'Subir una foto' : 'Upload a photo'}
              </button>
              <button type="button" onClick={() => choose({ work: null, image: null })} className="glass-button">
                {es ? 'Sin portada' : 'No cover'}
              </button>
            </div>
          </>
        );
      }}
    </PortfolioSheet>
  );
}
