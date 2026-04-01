import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase, Work } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

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
    hashtags: work.hashtags || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: updateError } = await supabase
      .from('works')
      .update({
        title: form.title,
        description: form.description,
        hashtags: form.hashtags,
      })
      .eq('id', work.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-light text-[hsl(var(--foreground))]">
            {es ? 'Editar obra' : 'Edit work'}
          </h2>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-2 block">
              {es ? 'Título' : 'Title'}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
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
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm placeholder:text-[hsl(var(--muted-foreground))]"
              placeholder="#arte #musica"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Guardar cambios' : 'Save changes')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))] transition-colors"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
