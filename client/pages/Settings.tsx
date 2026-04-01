import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2, LogOut, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, resetPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword || !confirmPassword) {
      setError('Los campos de nueva contraseña son requeridos.');
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
        setSuccess('Contraseña actualizada correctamente.');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!user?.email) throw new Error('No email found');
      
      const { error } = await resetPassword(user.email);

      if (error) {
        setError(error);
      } else {
        setSuccess('Email de reseteo enviado. Revisa tu bandeja.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al enviar email.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro? Esta acción es IRREVERSIBLE y borrará tu cuenta y todo tu contenido.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Delete user via Supabase Auth (this also cascades deletes)
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Cuenta eliminada. Redirigiendo...');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar cuenta.');
    } finally {
      setLoading(false);
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

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-sm text-green-500">{success}</p>
          </div>
        )}

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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
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

          <Button
            onClick={handleSendResetEmail}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
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
            disabled={loading}
            variant="outline"
            className="w-full"
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

          {!showDeleteConfirm ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Eliminar tu cuenta es IRREVERSIBLE. Se borrarán todos tus datos, obras y historial.
            </p>
          ) : (
            <p className="text-sm text-red-500 mb-4">
              ¿Realmente quieres eliminar tu cuenta? Escribe "DELETE" si estás seguro(a):
            </p>
          )}

          <Button
            onClick={() => {
              if (showDeleteConfirm) {
                handleDeleteAccount();
              } else {
                setShowDeleteConfirm(true);
              }
            }}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar Cuenta'
            )}
          </Button>

          {showDeleteConfirm && (
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
              variant="outline"
              className="w-full mt-2"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
