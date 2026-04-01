import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user came from email link (has recovery session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.recovery_sent_at === null) {
        // No recovery session, redirect to login
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validations
    if (!newPassword || !confirmPassword) {
      setError('Ambos campos son requeridos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al resetear la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header hideSearch />
      
      <div className="w-full max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            Resetear Contraseña
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-500">
                ¡Contraseña actualizada! Redirigiendo...
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              Nueva Contraseña
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              disabled={loading || success}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              Confirmar Contraseña
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              disabled={loading || success}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || success}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetear...
              </>
            ) : (
              'Resetear Contraseña'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
          ¿Ya tienes contraseña?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-[hsl(var(--foreground))] hover:underline font-medium"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}
