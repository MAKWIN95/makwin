import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workId: string;
  userId: string | undefined;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  { value: 'porno', label: 'Contenido +18', labelEn: 'Adult content' },
  { value: 'gore', label: 'Violencia gráfica', labelEn: 'Graphic violence' },
  { value: 'spam', label: 'Spam', labelEn: 'Spam' },
  { value: 'acoso', label: 'Acoso/Abuso', labelEn: 'Harassment' },
  { value: 'otro', label: 'Otro', labelEn: 'Other' },
];

export default function ReportModal({ 
  isOpen, 
  onClose, 
  workId,
  userId,
  onSuccess
}: ReportModalProps) {
  const { language: currentLang } = useI18n();
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason || (reason === 'otro' && !customReason.trim())) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('policy_reports').insert({
        work_id: workId,
        reporter_id: userId,
        reason,
        details: reason === 'otro' ? customReason : null,
      });

      if (error) throw error;

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setReason('');
        setCustomReason('');
        setSubmitted(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error('[ReportModal] Error:', err);
      alert('Error al enviar reporte. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const isOtherSelected = reason === 'other';
  const isFormValid = reason && (isOtherSelected ? customReason.trim() : true);

  // ISSUE 3 FIX: Use createPortal to render modal at document.body
  // This ensures it's truly fixed and not constrained by parent grid
  const modalContent = (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          disabled={loading}
        >
          <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </button>

        {!submitted ? (
          <>
            {/* Title */}
            <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {currentLang === 'es' ? 'Reportar obra' : 'Report work'}
            </h3>

            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              {currentLang === 'es' 
                ? '¿Cuál es el motivo de tu reporte? Nos ayuda a mantener la plataforma segura.'
                : 'What is the reason for your report? It helps us keep the platform safe.'}
            </p>

            {/* Reason options */}
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="reason"
                    value={opt.value}
                    checked={reason === opt.value}
                    onChange={(e) => { e.stopPropagation(); setReason(e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={loading}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-[hsl(var(--foreground))]">
                    {currentLang === 'es' ? opt.label : opt.labelEn}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom reason textarea */}
            {reason === 'otro' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={currentLang === 'es' ? 'Cuéntanos más...' : 'Tell us more...'}
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none mb-4"
              />
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={loading}
                className="flex-1"
              >
                {currentLang === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || loading}
                className="flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {currentLang === 'es' ? 'Enviar reporte' : 'Send report'}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Success message */}
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-2">
                {currentLang === 'es' ? '¡Reporte enviado!' : 'Report sent!'}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center">
                {currentLang === 'es' 
                  ? 'Tu denuncia está siendo revisada por nuestro equipo.'
                  : 'Your report is being reviewed by our team.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
}
