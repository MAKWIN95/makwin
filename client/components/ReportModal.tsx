import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { authHeaders } from '@/lib/adminApi';
import { toast } from 'sonner';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workId: string;
  userId: string | undefined;
  onSuccess?: () => void;
}

const MAX_REASONS = 2;

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
  const [reasons, setReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const wantsDetails = reasons.includes('otro');
  const isFormValid = reasons.length > 0 && (!wantsDetails || !!customReason.trim());

  const toggleReason = (value: string) =>
    setReasons((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < MAX_REASONS ? [...current, value] : current,
    );

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({
          workId,
          reasons,
          details: wantsDetails ? customReason.trim() : null,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setReasons([]);
        setCustomReason('');
        setSubmitted(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error('[ReportModal] Error:', err);
      toast.error(currentLang === 'es' ? 'No se pudo enviar el reporte. Inténtalo más tarde.' : 'The report could not be sent. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // ISSUE 3 FIX: Use createPortal to render modal at document.body
  // This ensures it's truly fixed and not constrained by parent grid
  const modalContent = (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="tap-area absolute top-4 right-4 p-1 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
          disabled={loading}
          aria-label={currentLang === 'es' ? 'Cerrar' : 'Close'}
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
                ? '¿Cuál es el motivo de tu reporte? Puedes marcar hasta dos.'
                : 'What is the reason for your report? You can choose up to two.'}
            </p>

            {/* Reason options */}
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((opt) => {
                const selected = reasons.includes(opt.value);
                const full = !selected && reasons.length >= MAX_REASONS;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selected ? 'border-[hsl(var(--foreground))]' : 'border-[hsl(var(--border))]'
                    } ${full ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[hsl(var(--foreground)/0.05)]'}`}
                  >
                    <Checkbox
                      checked={selected}
                      disabled={loading || full}
                      onCheckedChange={() => toggleReason(opt.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5 rounded border-2 !transition-none border-[hsl(var(--foreground))] data-[state=checked]:bg-[hsl(var(--foreground))] data-[state=checked]:text-[hsl(var(--background))]"
                    />
                    <span className="text-sm text-[hsl(var(--foreground))]">
                      {currentLang === 'es' ? opt.label : opt.labelEn}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Custom reason textarea */}
            {wantsDetails && (
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
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-2">
                {currentLang === 'es' ? 'Reporte enviado' : 'Report sent'}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] text-center">
                {currentLang === 'es' 
                  ? 'Nuestro equipo lo revisará.'
                  : 'Our team will review it.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
}
