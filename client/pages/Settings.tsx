import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2, LogOut, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getPasswordPolicyError, getPasswordStrengthScore } from '@/lib/passwordPolicy';
import { getPasswordUpdateErrorMessage } from '@/lib/passwordUpdateError';
import { withPasswordNotificationLanguage } from '@/lib/passwordNotificationMetadata';
import { useI18n } from '@/lib/i18n';

export default function Settings() {
  useRequireAuth();
  const navigate = useNavigate();
  const { user, signOut, resetPassword } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const passwordUpdateInFlightRef = useRef(false);
  const passwordPolicyError = getPasswordPolicyError(newPassword, language);
  const passwordStrength = getPasswordStrengthScore(newPassword);
  
  // Reset email state
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  
  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Countdown for delete confirmation
  useEffect(() => {
    if (!showDeleteModal) return;
    if (deleteCountdown <= 0) return;

    const timer = setTimeout(() => {
      setDeleteCountdown(deleteCountdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showDeleteModal, deleteCountdown]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordUpdateInFlightRef.current) return;
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError(es ? 'Los campos de nueva contraseña son obligatorios.' : 'New password fields are required.');
      return;
    }

    if (passwordPolicyError) {
      setPasswordError(passwordPolicyError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(es ? 'Las contraseñas no coinciden.' : 'Passwords do not match.');
      return;
    }

    passwordUpdateInFlightRef.current = true;
    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: withPasswordNotificationLanguage(user?.user_metadata, language),
      });

      if (error) {
        setPasswordError(getPasswordUpdateErrorMessage(error, language));
      } else {
        setPasswordSuccess(es ? 'Contraseña actualizada correctamente.' : 'Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(getPasswordUpdateErrorMessage(err, language));
    } finally {
      passwordUpdateInFlightRef.current = false;
      setPasswordLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setEmailSuccess(false);
    setEmailLoading(true);

    try {
      if (!user?.email) throw new Error('No email found');
      
      const { error } = await resetPassword(user.email);

      if (error) {
        console.error('[Settings] Password reset request failed:', error);
        alert(es ? 'No se pudo enviar el correo de restablecimiento.' : 'The password reset email could not be sent.');
      } else {
        setEmailSuccess(true);
        setTimeout(() => setEmailSuccess(false), 3000);
      }
    } catch (err: any) {
        console.error('[Settings] Password reset request failed:', err);
        alert(es ? 'No se pudo enviar el correo de restablecimiento.' : 'The password reset email could not be sent.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);

    try {
      // Get current session with access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        alert(es ? 'Error: No hay una sesión activa. Inicia sesión de nuevo.' : 'Error: No active session. Please sign in again.');
        setDeleteLoading(false);
        return;
      }

      // Call backend to delete all account data
      const deleteResponse = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        console.error('[Settings] Account deletion failed:', errorData.error);
        alert(es ? 'No se pudo eliminar la cuenta.' : 'Could not delete the account.');
        setDeleteLoading(false);
        return;
      }

      console.log('[Settings] Account deleted successfully');

      // CRITICAL: Clear all auth data from storage BEFORE signing out
      // This prevents the ghost account issue
      localStorage.removeItem('sb-vaompdhmnnvgzybhhqak-auth-token');
      localStorage.removeItem('sb-vaompdhmnnvgzybhhqak-auth');
      sessionStorage.clear();
      
      // Clear any Supabase related keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      // Then sign out from Supabase (this should be redundant now)
      await signOut();

      // Navigate away
      navigate('/');
    } catch (err: any) {
      console.error('[Settings] Error deleting account:', err);
      alert(es ? 'No se pudo eliminar la cuenta. Inténtalo más tarde.' : 'Could not delete the account. Please try again later.');
      setDeleteLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header hideSearch />

      <div className="w-full max-w-2xl mx-auto px-4 py-12 page-enter">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-8">
          {es ? 'Configuración de cuenta' : 'Account settings'}
        </h1>

        {/* Email Info */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {es ? 'Correo electrónico' : 'Email'}
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] break-all">{user?.email}</p>
        </div>

        {/* Change Password */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {es ? 'Cambiar contraseña' : 'Change password'}
          </h2>

          {/* Error/Success for password change - positioned right below title */}
          {passwordError && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-500">{passwordSuccess}</p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                {es ? 'Nueva contraseña' : 'New password'}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={es ? 'Mínimo 8 caracteres, sin espacios' : 'At least 8 characters, no spaces'}
                disabled={passwordLoading}
              />
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div className={`h-full rounded-full transition-all ${passwordStrength <= 1 ? 'bg-red-500' : passwordStrength === 2 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{passwordStrength <= 1 ? (es ? 'Débil' : 'Weak') : passwordStrength === 2 ? (es ? 'Media' : 'Fair') : (es ? 'Fuerte' : 'Strong')}</span>
              </div>
              <p className={`mt-2 text-xs ${passwordPolicyError ? 'text-amber-500' : 'text-[hsl(var(--muted-foreground))]'}`}>{passwordPolicyError || (es ? 'Mínimo 8 caracteres y sin espacios.' : 'At least 8 characters and no spaces.')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                {es ? 'Confirmar contraseña' : 'Confirm password'}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={es ? 'Confirma la nueva contraseña' : 'Confirm your new password'}
                disabled={passwordLoading}
              />
              {confirmPassword && newPassword !== confirmPassword && <p className="mt-2 text-xs text-red-500">{es ? 'Las contraseñas no coinciden.' : 'Passwords do not match.'}</p>}
            </div>

            <Button type="submit" disabled={passwordLoading || !!passwordPolicyError || !newPassword || !confirmPassword || newPassword !== confirmPassword} className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
              {passwordLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {es ? 'Actualizando...' : 'Updating...'}
                </>
              ) : (
                es ? 'Cambiar contraseña' : 'Change password'
              )}
            </Button>
          </form>
        </div>

        {/* Reset via Email */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {es ? 'Restablecer por correo' : 'Reset via email'}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {es ? 'Recibe un enlace por correo para restablecer tu contraseña' : 'Receive an email link to reset your password'}
          </p>

          {emailSuccess && (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-500">{es ? 'Correo de restablecimiento enviado. Revisa tu bandeja.' : 'Password reset email sent. Check your inbox.'}</p>
            </div>
          )}

          <Button
            onClick={handleSendResetEmail}
            disabled={emailLoading}
            variant="outline"
            className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            {emailLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {es ? 'Enviando...' : 'Sending...'}
              </>
            ) : (
              es ? 'Enviar correo de restablecimiento' : 'Send password reset email'
            )}
          </Button>
        </div>

        {/* Session Management */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            {es ? 'Sesión' : 'Session'}
          </h2>

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {es ? 'Cerrar sesión' : 'Sign out'}
          </Button>
        </div>

        {/* Delete Account */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            {es ? 'Zona de peligro' : 'Danger zone'}
          </h2>

          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {es ? 'Eliminar tu cuenta es IRREVERSIBLE. Se borrarán todos tus datos, obras e historial.' : 'Deleting your account is IRREVERSIBLE. All your data, works, and history will be deleted.'}
          </p>

          <Button
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteCountdown(5);
            }}
            variant="destructive"
            className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            {es ? 'Eliminar cuenta' : 'Delete account'}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-[hsl(var(--muted))] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>

            {/* Title */}
            <h3 className="text-xl font-bold text-red-500 mb-3">
              {es ? 'Eliminar cuenta' : 'Delete account'}
            </h3>

            {/* Warning text */}
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              {es ? <>Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente:</> : <>This action is <strong>IRREVERSIBLE</strong>. The following will be permanently deleted:</>}
            </p>

            <ul className="text-xs text-[hsl(var(--muted-foreground))] space-y-1 mb-6 pl-4">
              <li>✗ {es ? 'Tu perfil de usuario' : 'Your user profile'}</li>
              <li>✗ {es ? 'Todas tus obras publicadas' : 'All your published works'}</li>
              <li>✗ {es ? 'Tu historial completo' : 'Your complete history'}</li>
              <li>✗ {es ? 'Todos tus datos personales' : 'All your personal data'}</li>
            </ul>

            {/* Countdown */}
            <p className="text-sm font-semibold text-[hsl(var(--foreground))] mb-6">
              {es ? 'Podrás eliminar la cuenta en:' : 'You can delete your account in:'}{' '}
              <span className="text-red-500">{deleteCountdown}s</span>
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="outline"
                className="flex-1"
                disabled={deleteLoading}
              >
                {es ? 'Cancelar' : 'Cancel'}
              </Button>

              <Button
                onClick={handleDeleteAccount}
                disabled={deleteCountdown > 0 || deleteLoading}
                variant="destructive"
                className="flex-1"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {es ? 'Eliminando...' : 'Deleting...'}
                  </>
                ) : (
                  es ? 'Eliminar cuenta' : 'Delete account'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
