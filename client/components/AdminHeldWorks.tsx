import { useState, type Dispatch, type SetStateAction } from 'react';
import { Eye, Loader, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authHeaders } from '@/lib/adminApi';
import { useI18n } from '@/lib/i18n';

export interface HeldWork {
  id: string;
  title: string;
  description: string | null;
  lyrics: string | null;
  hashtags: string[] | null;
  work_type: string;
  file_url: string | null;
  cover_url: string | null;
  extra_images?: string[];
  policy_flags: string[];
  created_at: string;
  user: { username: string } | null;
}

const SOURCES: Record<string, { es: string; en: string }> = {
  image: { es: 'Imagen', en: 'Image' },
  video: { es: 'Vídeo', en: 'Video' },
  cover: { es: 'Portada', en: 'Cover' },
};

const VERDICTS: Record<string, { es: string; en: string }> = {
  porn: { es: 'contenido sexual explícito', en: 'explicit sexual content' },
  hentai: { es: 'dibujo sexual explícito', en: 'explicit sexual drawing' },
  sexy: { es: 'contenido sugerente', en: 'suggestive content' },
  unchecked: { es: 'no se ha podido analizar', en: 'could not be analysed' },
};

function describeFlag(flag: string, language: 'es' | 'en'): string {
  if (flag === 'checking') return language === 'es' ? 'La comprobación automática no llegó a terminar' : 'The automatic check did not finish';
  const [source, ...rest] = flag.split(':');
  const value = rest.join(':');
  if (source === 'text') return `${language === 'es' ? 'Texto' : 'Text'}: «${value}»`;
  return `${SOURCES[source]?.[language] ?? source}: ${VERDICTS[value]?.[language] ?? value}`;
}

export default function AdminHeldWorks({ works, setWorks }: { works: HeldWork[]; setWorks: Dispatch<SetStateAction<HeldWork[]>> }) {
  const { language } = useI18n();
  const es = language === 'es';
  const [busy, setBusy] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const decide = async (work: HeldWork, decision: 'approve' | 'delete') => {
    if (decision === 'delete' && !confirm(es ? `¿Borrar «${work.title}» definitivamente?` : `Delete "${work.title}" permanently?`)) return;
    setBusy(work.id);
    try {
      const response = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ heldWorkId: work.id, decision }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setWorks((current) => current.filter((item) => item.id !== work.id));
      toast.success(decision === 'approve' ? (es ? 'Obra publicada' : 'Work published') : (es ? 'Obra borrada' : 'Work deleted'));
    } catch (error) {
      console.error('[AdminHeldWorks] Could not decide:', error);
      toast.error(es ? 'No se pudo completar. Inténtalo de nuevo.' : 'That did not work. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const reveal = (id: string) => setRevealed((current) => new Set(current).add(id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h2 className="text-xl font-bold">{es ? 'Obras retenidas' : 'Held works'}</h2>
        <span className="ml-auto text-sm text-[hsl(var(--muted-foreground))]">{works.length}</span>
      </div>

      {works.length === 0 ? (
        <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
          {es ? 'El filtro automático no ha retenido ninguna obra' : 'The automatic filter has not held any work'}
        </div>
      ) : (
        works.map((work) => {
          const image = work.cover_url ?? (work.work_type === 'pintura' || work.work_type === 'fotografia' ? work.file_url : null);
          const isRevealed = revealed.has(work.id);
          return (
            <div key={work.id} className="border border-[hsl(var(--border))] rounded-lg p-4 flex flex-col sm:flex-row gap-4">
              {(image || work.work_type === 'video') && (
                <div className="relative w-full sm:w-48 h-48 flex-shrink-0 overflow-hidden rounded bg-[hsl(var(--muted))]">
                  {work.work_type === 'video' && work.file_url && isRevealed ? (
                    <video src={work.file_url} controls className="w-full h-full object-contain" />
                  ) : image ? (
                    <img src={image} alt={work.title} className={`w-full h-full object-cover ${isRevealed ? '' : 'blur-xl scale-110'}`} />
                  ) : null}
                  {!isRevealed && (
                    <button
                      type="button"
                      onClick={() => reveal(work.id)}
                      className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-[hsl(var(--foreground))]"
                    >
                      <Eye className="w-4 h-4" />
                      {es ? 'Ver' : 'Show'}
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[hsl(var(--foreground))]">{work.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
                  {work.user?.username ? `@${work.user.username} · ` : ''}
                  {new Date(work.created_at).toLocaleDateString(es ? 'es-ES' : 'en-US')}
                </p>
                <ul className="mb-3 space-y-1">
                  {work.policy_flags
                    .filter((flag) => flag !== 'pending_review')
                    .map((flag) => (
                      <li key={flag} className="text-sm text-red-500">{describeFlag(flag, language)}</li>
                    ))}
                </ul>
                {work.description && <p className="text-sm whitespace-pre-wrap mb-2">{work.description}</p>}
                {work.lyrics && (
                  <p className="text-sm whitespace-pre-wrap mb-2 max-h-40 overflow-y-auto text-[hsl(var(--muted-foreground))]">{work.lyrics}</p>
                )}
                {!!work.extra_images?.length && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {work.extra_images.map((url) => (
                      <div key={url} className="w-16 h-16 overflow-hidden rounded bg-[hsl(var(--muted))]">
                        <img src={url} alt="" className={`w-full h-full object-cover ${isRevealed ? '' : 'blur-md scale-110'}`} />
                      </div>
                    ))}
                  </div>
                )}
                {work.work_type !== 'video' && work.file_url && !image && <audio src={work.file_url} controls className="w-full mb-3" />}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" disabled={busy === work.id} onClick={() => decide(work, 'approve')}>
                    {busy === work.id ? <Loader className="w-4 h-4 animate-spin" /> : es ? 'Aprobar' : 'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500" disabled={busy === work.id} onClick={() => decide(work, 'delete')}>
                    {es ? 'Borrar' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
