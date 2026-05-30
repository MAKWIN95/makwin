import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

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

    const { error: deleteError } = await supabase
      .from('works')
      .delete()
      .eq('id', workId);

    setLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-2xl max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
              className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? (es ? 'Eliminando...' : 'Deleting...') : (es ? 'Eliminar' : 'Delete')}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
