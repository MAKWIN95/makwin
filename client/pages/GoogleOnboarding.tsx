import React, { useEffect, useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';

function parseSuggestedUsername(email?: string) {
  if (!email) return '';
  const local = email.split('@')[0] || '';
  return local.replace(/[^a-z0-9_.]/gi, '').replace(/^[._]+|[._]+$/g, '').toLowerCase();
}

function validateUsername(username: string) {
  const usernameRegex = /^[a-z0-9]([a-z0-9_.]*[a-z0-9])?$/;
  return usernameRegex.test(username);
}

function strengthScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

async function findAvailableUsername(base: string): Promise<string> {
  const sanitized = (base || 'makwin').replace(/[^a-z0-9_.]/gi, '').replace(/^[._]+|[._]+$/g, '').toLowerCase();
  const candidates = sanitized ? [sanitized, `${sanitized}1`, `${sanitized}_1`, `${sanitized}art`, `${sanitized}.art`] : ['makwin', 'makwin1'];

  for (const candidate of candidates) {
    if (!candidate || !validateUsername(candidate)) continue;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();

    if (!data) return candidate;
  }

  let index = 2;
  while (index < 1000) {
    const candidate = `${sanitized || 'makwin'}${index}`;
    const { data } = await supabase.from('profiles').select('id').eq('username', candidate).maybeSingle();
    if (!data) return candidate;
    index += 1;
  }

  return sanitized || 'makwin';
}

export default function GoogleOnboardingPage() {
  const { user, completeGoogleSignUp, needsUsernameSetup } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const navigate = useNavigate();

  const suggested = useMemo(() => parseSuggestedUsername(user?.email), [user?.email]);

  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const prepareSuggestedUsername = async () => {
      const base = parseSuggestedUsername(user?.email);
      if (!base) {
        setUsername('');
        return;
      }
      const availableUsername = await findAvailableUsername(base);
      if (isMounted) {
        setUsername(availableUsername);
      }
    };

    prepareSuggestedUsername();
    return () => { isMounted = false; };
  }, [user?.email]);

  useEffect(() => {
    if (!needsUsernameSetup) {
      navigate('/galeria', { replace: true });
    }
  }, [needsUsernameSetup, navigate]);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!username || username.length < 2) {
        setAvailable(null);
        return;
      }
      if (!validateUsername(username)) {
        setAvailable(false);
        return;
      }
      try {
        const { data } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle();
        setAvailable(!data);
      } catch (err) {
        setAvailable(null);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalUsername = username.trim();

    if (!finalUsername || !displayName.trim() || !password.trim() || !confirm.trim()) {
      setError(es ? 'Todos los campos son obligatorios.' : 'All fields are required.');
      return;
    }

    if (!validateUsername(finalUsername)) {
      setError(es ? 'Nombre de usuario inválido.' : 'Invalid username.');
      return;
    }

    if (available === false) {
      setError(es ? 'Este nombre de usuario ya está en uso.' : 'This username is already in use.');
      return;
    }

    if (password.length < 8) {
      setError(es ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirm) {
      setError(es ? 'Las contraseñas no coinciden.' : "Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await completeGoogleSignUp(finalUsername.toLowerCase(), password, displayName.trim());
    setLoading(false);

    if (res.error) {
      const lower = String(res.error).toLowerCase();
      if (lower.includes('usuario') || lower.includes('nombre de usuario') || lower.includes('already')) {
        setAvailable(false);
      }
      setError(res.error);
      return;
    }

    navigate('/galeria', { replace: true });
  };

  const score = strengthScore(password);
  const strengthLabel = score <= 1 ? (es ? 'Débil' : 'Weak') : score === 2 ? (es ? 'Media' : 'Fair') : (es ? 'Fuerte' : 'Strong');

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))]/90 p-6 shadow-[0_0_40px_rgba(255,255,255,0.05)] backdrop-blur-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">{es ? 'Completa tu cuenta' : 'Complete your account'}</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{es ? 'Tu acceso a MAKWIN está casi listo.' : 'Your MAKWIN access is almost ready.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">{es ? 'Username' : 'Username'}</label>
              <div className="mb-2 inline-flex items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-2.5 py-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                @
                <span className="ml-1">{username || suggested || 'usuario'}</span>
              </div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-[hsl(var(--ring))]"
                placeholder={es ? 'tu_usuario' : 'your_handle'}
              />
              {available === false && <div className="mt-2 text-xs text-red-500">{es ? 'Este username ya está ocupado.' : 'This username is already taken.'}</div>}
              {available === true && <div className="mt-2 text-xs text-emerald-400">{es ? 'Username disponible.' : 'Username available.'}</div>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">{es ? 'Nombre a mostrar' : 'Display name'}</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2.5 text-sm outline-none transition focus:border-[hsl(var(--ring))]" placeholder={es ? 'Tu nombre' : 'Your name'} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">{es ? 'Establece una contraseña' : 'Set a password'}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-[hsl(var(--ring))]" placeholder={es ? '••••••••' : '••••••••'} />
                <button type="button" aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPw(s => !s)} className="absolute inset-y-0 right-3 flex items-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                  <div className={`h-full rounded-full transition-all ${score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${(score / 4) * 100}%` }} />
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))]">{strengthLabel}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">{es ? 'Repite la contraseña' : 'Confirm password'}</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-[hsl(var(--ring))]" placeholder={es ? '••••••••' : '••••••••'} />
                <button type="button" aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'} onClick={() => setShowConfirm(s => !s)} className="absolute inset-y-0 right-3 flex items-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

            <button
              type="submit"
              disabled={loading || available === false || !username || !displayName.trim() || !password || !confirm}
              className="w-full rounded-xl bg-[hsl(var(--foreground))] px-4 py-3 text-sm font-medium text-[hsl(var(--background))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Continuar' : 'Continue')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
