import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2, LogOut, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, resetPassword } = useAuth();
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  
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
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError('Los campos de nueva contraseña son requeridos.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setPasswordLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Show loading briefly
      
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess('Contraseña actualizada correctamente.');
        setNewPassword('');
        setConfirmPassword('');
        
        // Redirect to previous page or home after 2s
        setTimeout(() => {
          const lastPage = sessionStorage.getItem('lastPage') || '/';
          navigate(lastPage);
        }, 2000);
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Error al cambiar la contraseña.');
    } finally {
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
        alert('Error: ' + error);
      } else {
        setEmailSuccess(true);
        setTimeout(() => setEmailSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err?.message || 'Error al enviar email.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);

    try {
      // Sign out first
      await signOut();
      
      // Then delete account via auth provider
      const { error } = await supabase.auth.updateUser({
        data: { deleted: true }
      });

      if (error) {
        alert('Error: ' + error.message);
        setDeleteLoading(false);
        return;
      }

      // Navigate away
      navigate('/');
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar cuenta. Intenta más tarde.');
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

      <div className="w-full max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-8">
          Configuración de Cuenta
        </h1>

        {/* Email Info */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            Email
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] break-all">{user?.email}</p>
        </div>

        {/* Change Password */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            Cambiar Contraseña
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
                Nueva Contraseña
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={passwordLoading}
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
                disabled={passwordLoading}
              />
            </div>

            <Button type="submit" disabled={passwordLoading} className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
              {passwordLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Cambiar Contraseña'
              )}
            </Button>
          </form>
        </div>

        {/* Reset via Email */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            Resetear vía Email
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Recibe un link por email para resetear tu contraseña
          </p>

          {emailSuccess && (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-xs text-green-500">Email de reseteo enviado. Revisa tu bandeja.</p>
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
                Enviando...
              </>
            ) : (
              'Enviar Email de Reset'
            )}
          </Button>
        </div>

        {/* Session Management */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">
            Sesión
          </h2>

          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>

        {/* Delete Account */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Zona de Peligro
          </h2>

          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Eliminar tu cuenta es IRREVERSIBLE. Se borrarán todos tus datos, obras y historial.
          </p>

          <Button
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteCountdown(5);
            }}
            variant="destructive"
            className="w-full transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          >
            Eliminar Cuenta
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
              Eliminar Cuenta
            </h3>

            {/* Warning text */}
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente:
            </p>

            <ul className="text-xs text-[hsl(var(--muted-foreground))] space-y-1 mb-6 pl-4">
              <li>✗ Tu perfil de usuario</li>
              <li>✗ Todas tus obras publicadas</li>
              <li>✗ Tu historial completo</li>
              <li>✗ Todos tus datos personales</li>
            </ul>

            {/* Countdown */}
            <p className="text-sm font-semibold text-[hsl(var(--foreground))] mb-6">
              Podrás eliminar la cuenta en:{' '}
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
                Cancelar
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
                    Eliminando...
                  </>
                ) : (
                  'Eliminar Cuenta'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
