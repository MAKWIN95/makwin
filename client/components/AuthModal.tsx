import { useNavigate } from 'react-router-dom';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  title = 'Inicia sesión para continuar',
  description = 'Necesitas una cuenta para hacer esto'
}: AuthModalProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleRegister = () => {
    onClose();
    navigate('/registro');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </button>

        {/* Content */}
        <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
          {title}
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {description}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            Iniciar Sesión
          </Button>
          <Button
            onClick={handleRegister}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            Crear Cuenta
          </Button>
        </div>
      </div>
    </div>
  );
}
