import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';

export default function GoogleSignupModal() {
  const { needsUsernameSetup, completeGoogleSignUp, user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim() || !displayName.trim()) {
      setError(es ? 'Todos los campos son obligatorios.' : 'All fields are required.');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9]([a-z0-9_.]*[a-z0-9])?$/;
    if (!usernameRegex.test(username)) {
      setError(
        es
          ? 'El nombre de usuario debe comenzar con letra/número, sin puntos al inicio o final.'
          : 'Username must start with a letter/number and not end with a dot.'
      );
      return;
    }

    if (password.length < 6) {
      setError(es ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await completeGoogleSignUp(username, password, displayName);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <Dialog open={needsUsernameSetup} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{es ? 'Completar perfil' : 'Complete your profile'}</DialogTitle>
          <DialogDescription>
            {es
              ? 'Elige un nombre de usuario y contraseña para tu cuenta.'
              : 'Choose a username and password for your account.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
              {es ? 'Nombre de usuario' : 'Username'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="tu_usuario"
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
              {es ? 'Nombre (para mostrar)' : 'Display name'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={es ? 'Tu nombre' : 'Your name'}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
              {es ? 'Contraseña' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={es ? '••••••' : '••••••'}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '…' : (es ? 'Continuar' : 'Continue')}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
