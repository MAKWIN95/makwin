import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { withPasswordNotificationLanguage } from '@/lib/passwordNotificationMetadata';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, resetPassword } = useAuth();
  const { t, language } = useI18n();
  const es = language === 'es';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!data.session || data.session.user.recovery_sent_at === null) {
          setLinkExpired(true);
        }
      } catch (err: any) {
        console.error('[ResetPassword] Error checking session:', err?.message || err);
        if (isMounted) setLinkExpired(true);
      } finally {
        if (isMounted) setCheckingSession(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session || session.user.recovery_sent_at === null) {
        setLinkExpired(true);
      } else {
        setLinkExpired(false);
      }
      setCheckingSession(false);
    });

    checkInitialSession();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validations
    if (!newPassword || !confirmPassword) {
      setError(es ? 'Ambos campos son obligatorios.' : 'Both fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError(es ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(es ? 'Las contraseñas no coinciden.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: withPasswordNotificationLanguage(user?.user_metadata, language),
      });

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
      setError(err?.message || (es ? 'Error al restablecer la contraseña.' : 'Unable to reset the password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setSendingReset(true);
    try {
      if (!user?.email) throw new Error('No email found');
      
      const { error } = await resetPassword(user.email);

      if (error) {
        alert('Error: ' + error);
      } else {
        alert(es ? 'Correo de restablecimiento enviado. Revisa tu bandeja.' : 'Password reset email sent. Check your inbox.');
      }
    } catch (err: any) {
      alert(err?.message || (es ? 'Error al enviar el correo.' : 'Unable to send the email.'));
    } finally {
      setSendingReset(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Header hideSearch />
        <div className="w-full max-w-md mx-auto px-4 py-16 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[hsl(var(--foreground))]" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{es ? 'Validando el enlace de restablecimiento…' : 'Validating reset link…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header hideSearch />
      
      <div className="w-full max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            {es ? 'Restablecer contraseña' : 'Reset password'}
          </h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            {linkExpired ? (es ? 'El enlace ha caducado' : 'This link has expired') : (es ? 'Introduce tu nueva contraseña' : 'Enter your new password')}
          </p>
        </div>

        {linkExpired ? (
          // Link expired state
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
              <p className="text-sm text-yellow-500">
                {es ? 'Este enlace ya se ha usado o ha caducado. Los enlaces son de un solo uso y caducan en 24 horas.' : 'This link has already been used or has expired. Links can only be used once and expire after 24 hours.'}
              </p>
            </div>

            <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
              {es ? 'Solicita un nuevo enlace de restablecimiento desde la página de inicio de sesión.' : 'Request a new reset link from the sign-in page.'}
            </p>

            <Button
              onClick={() => navigate('/login')}
              className="w-full"
            >
              {es ? 'Ir a inicio de sesión' : 'Go to sign in'}
            </Button>

            {user?.email && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[hsl(var(--border))]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[hsl(var(--background))] px-2 text-[hsl(var(--muted-foreground))]">
                      {es ? 'O' : 'OR'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSendResetEmail}
                  disabled={sendingReset}
                  variant="outline"
                  className="w-full"
                >
                  {sendingReset ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {es ? 'Enviando...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      {es ? 'Reenviar correo a' : 'Resend email to'} {user.email}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        ) : (
          // Normal reset password form
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
                  {es ? '¡Contraseña actualizada! Redirigiendo...' : 'Password updated! Redirecting...'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                {es ? 'Nueva contraseña' : 'New password'}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={es ? 'Mínimo 8 caracteres' : 'At least 8 characters'}
                disabled={loading || success}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                {es ? 'Confirmar contraseña' : 'Confirm password'}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={es ? 'Repite tu contraseña' : 'Re-enter your password'}
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
                  {es ? 'Restableciendo...' : 'Resetting...'}
                </>
              ) : (
                es ? 'Restablecer contraseña' : 'Reset password'
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
          {es ? '¿Ya tienes contraseña?' : 'Already have a password?'}{' '}
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
