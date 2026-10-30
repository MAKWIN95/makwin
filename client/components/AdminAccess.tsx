import { useEffect, useState, type FormEvent } from 'react';
import { Loader, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authHeaders } from '@/lib/adminApi';
import { useI18n } from '@/lib/i18n';

interface AdminAccount {
  id: string;
  username: string | null;
  role: 'owner' | 'admin';
}

const ERRORS: Record<string, { es: string; en: string }> = {
  recent_login_required: {
    es: 'Por seguridad, cierra sesión y vuelve a entrar antes de cambiar administradores.',
    en: 'For security, sign out and back in before changing admins.',
  },
  user_not_found: { es: 'No existe ningún usuario con ese @.', en: 'No user has that @.' },
  invalid_username: { es: 'Escribe un @ válido.', en: 'Enter a valid @.' },
  email_not_confirmed: { es: 'Ese usuario aún no ha confirmado su correo.', en: 'That user has not confirmed their email yet.' },
  banned_user: { es: 'Ese usuario está bloqueado.', en: 'That user is banned.' },
  is_owner: { es: 'La cuenta principal no se puede cambiar desde aquí.', en: 'The main account cannot be changed here.' },
};

export default function AdminAccess() {
  const { language } = useI18n();
  const es = language === 'es';
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch('/api/reports?scope=admins', { headers: await authHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { admins: data } = await response.json();
    setAdmins(data);
  };

  useEffect(() => {
    load().catch((error) => {
      console.error('[AdminAccess] Could not load admins:', error);
      setAdmins([]);
      toast.error(es ? 'No se pudo cargar la lista' : 'The list could not be loaded');
    });
  }, []);

  const change = async (adminAction: 'grant' | 'revoke', target: string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ adminAction, username: target }),
      });
      if (!response.ok) {
        const { code } = await response.json().catch(() => ({ code: '' }));
        toast.error(ERRORS[code]?.[language] ?? (es ? 'No se pudo completar' : 'That did not work'));
        return;
      }
      toast.success(
        adminAction === 'grant'
          ? (es ? `@${target} ya es administrador y se le ha avisado` : `@${target} is now an admin and has been told`)
          : (es ? `@${target} ya no es administrador` : `@${target} is no longer an admin`),
      );
      setUsername('');
      await load();
    } catch (error) {
      console.error('[AdminAccess] Could not change admin:', error);
      toast.error(es ? 'No se pudo completar' : 'That did not work');
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const target = username.trim().replace(/^@/, '');
    if (!target) return;
    if (!confirm(es
      ? `¿Dar permisos de administrador a @${target}? Podrá ver mensajes, reportes y obras retenidas.`
      : `Make @${target} an admin? They will see messages, reports and held works.`)) return;
    change('grant', target);
  };

  const revoke = (target: string) => {
    if (!confirm(es ? `¿Quitar los permisos de administrador a @${target}?` : `Remove admin access from @${target}?`)) return;
    change('revoke', target);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h2 className="text-xl font-bold">{es ? 'Administradores' : 'Admins'}</h2>
      </div>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-lg">
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="@usuario"
          aria-label={es ? 'Usuario' : 'Username'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm focus:outline-none"
        />
        <Button type="submit" disabled={busy || !username.trim()}>
          {es ? 'Dar permisos' : 'Make admin'}
        </Button>
      </form>
      <p className="text-sm text-[hsl(var(--muted-foreground))]">
        {es
          ? 'Solo la cuenta principal puede dar o quitar permisos. Se avisa por correo a la persona.'
          : 'Only the main account can add or remove admins. The person is told by email.'}
      </p>

      {admins === null ? (
        <Loader className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      ) : (
        <ul className="space-y-2">
          {admins.map((admin) => (
            <li key={admin.id} className="flex items-center justify-between gap-3 border border-[hsl(var(--border))] rounded-lg px-4 py-3 text-sm">
              <span>
                {admin.username ? `@${admin.username}` : (es ? 'Sin usuario' : 'No username')}
                {admin.role === 'owner' && (
                  <span className="ml-2 text-[hsl(var(--muted-foreground))]">{es ? 'Cuenta principal' : 'Main account'}</span>
                )}
              </span>
              {admin.role === 'admin' && admin.username && (
                <Button size="sm" variant="outline" className="text-red-500" disabled={busy} onClick={() => revoke(admin.username!)}>
                  {es ? 'Quitar' : 'Remove'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
