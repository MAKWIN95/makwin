import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  title,
  description
}: AuthModalProps) {
  const navigate = useNavigate();
  const { language: currentLang } = useI18n();
  const es = currentLang === 'es';

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleRegister = () => {
    onClose();
    navigate('/registro');
  };

  // Rendered on <body>: opened from inside work cards, whose stacking and hover
  // effects must not clip or reposition this fixed overlay.
  return createPortal(
    <div className="glass-overlay fixed inset-0 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="glass-panel relative max-w-[22rem] w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain px-6 pt-8 pb-6 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label={es ? 'Cerrar' : 'Close'}
          className="tap-area ios-press absolute top-3.5 right-3.5 p-1 rounded-full text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-1.5 px-4">
          {title ?? (es ? 'Inicia sesión para continuar' : 'Sign in to continue')}
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {description ?? (es ? 'Necesitas una cuenta para hacer esto.' : 'You need an account to do this.')}
        </p>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={handleLogin} className="glass-button glass-button--primary w-full">
            {es ? 'Iniciar sesión' : 'Sign in'}
          </button>
          <button type="button" onClick={handleRegister} className="glass-button w-full">
            {es ? 'Crear cuenta' : 'Create account'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
