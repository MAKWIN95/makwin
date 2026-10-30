import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { supabase, Work } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { normalizeHashtags, formatHashtagsForInput } from '@/lib/utils';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  work: Work;
  onSuccess: () => void;
}

export default function EditWorkModal({ isOpen, onClose, work, onSuccess }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  
  const [form, setForm] = useState({
    title: work.title || '',
    description: work.description || '',
    hashtags: formatHashtagsForInput(work.hashtags),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const tagsArray = normalizeHashtags(form.hashtags);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/publish-work', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ id: work.id, title: form.title, description: form.description, hashtags: tagsArray }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { held } = await response.json();
      if (held) {
        toast.info(es ? 'Tu obra se revisará antes de volver a mostrarse.' : 'Your work will be reviewed before it is shown again.');
      }
    } catch (updateError) {
      console.error('[EditWorkModal] Could not save:', updateError);
      setError(es ? 'No se han podido guardar los cambios. Inténtalo de nuevo.' : 'The changes could not be saved. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

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
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
              {es ? 'Título' : 'Title'}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm placeholder:text-[hsl(var(--muted-foreground))]"
              placeholder={es ? 'Título de la obra' : 'Work title'}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
              {es ? 'Descripción' : 'Description'}
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm placeholder:text-[hsl(var(--muted-foreground))] resize-none"
              rows={4}
              placeholder={es ? 'Descripción' : 'Description'}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
              {es ? 'Hashtags (separados por espacio)' : 'Hashtags (space separated)'}
            </label>
            <input
              type="text"
              value={form.hashtags}
              onChange={e => setForm(p => ({ ...p, hashtags: e.target.value }))}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm placeholder:text-[hsl(var(--muted-foreground))]"
              placeholder="#arte #musica"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 glass-button glass-button--primary gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Guardar cambios' : 'Save changes')}
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
