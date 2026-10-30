import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workId: string;
  workTitle: string;
  onSuccess: () => void;
}

export default function DeleteWorkModal({ isOpen, onClose, workId, workTitle, onSuccess }: Props) {
  const { language } = useI18n();
  const es = language === 'es';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/publish-work?id=${encodeURIComponent(workId)}`, {
        method: 'DELETE',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (deleteError) {
      console.error('[DeleteWorkModal] Could not delete:', deleteError);
      setError(es ? 'No se ha podido eliminar la obra. Inténtalo de nuevo.' : 'The work could not be deleted. Please try again.');
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
      <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain glass-panel max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-light text-[hsl(var(--foreground))]">
              {es ? 'Eliminar obra' : 'Delete work'}
            </h2>
          </div>

          <p className="text-sm text-[hsl(var(--foreground))] mb-2">
            {es ? '¿Estás seguro de que quieres eliminar' : 'Are you sure you want to delete'} <strong>{workTitle}</strong>?
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">
            {es ? 'Esta acción no se puede deshacer.' : 'This action cannot be undone.'}
          </p>

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 glass-button glass-button--danger"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? (es ? 'Eliminando...' : 'Deleting...') : (es ? 'Eliminar' : 'Delete')}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 glass-button"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
