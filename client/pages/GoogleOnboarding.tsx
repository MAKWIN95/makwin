import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';

function parseSuggestedUsername(email?: string) {
  if (!email) return '';
  const local = email.split('@')[0] || '';
  // keep only allowed chars and lowercase
  return local.replace(/[^a-z0-9_.]/gi, '').toLowerCase();
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
  return score; // 0..4
}

export default function GoogleOnboardingPage() {
  const { user, completeGoogleSignUp, needsUsernameSetup } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';
  const navigate = useNavigate();

  const suggested = useMemo(() => parseSuggestedUsername(user?.email), [user?.email]);

  const [username, setUsername] = useState<string>(suggested);
  const [displayName, setDisplayName] = useState<string>(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setUsername(suggested);
  }, [suggested]);

  useEffect(() => {
    if (!needsUsernameSetup) {
      // If onboarding is not needed, go to gallery
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

    if (!username.trim() || !displayName.trim() || !password.trim() || !confirm.trim()) {
      setError(es ? 'Todos los campos son obligatorios.' : 'All fields are required.');
      return;
    }

    if (!validateUsername(username)) {
      setError(es ? 'Nombre de usuario inválido.' : 'Invalid username.');
      return;
    }

    if (password.length < 6) {
      setError(es ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirm) {
      setError(es ? 'Las contraseñas no coinciden.' : "Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await completeGoogleSignUp(username.toLowerCase(), password, displayName);
    setLoading(false);

    if (res.error) {
      // If username conflict, reflect in availability and guide user
      const lower = String(res.error).toLowerCase();
      if (lower.includes('usuario') || lower.includes('nombre de usuario') || lower.includes('already')) {
        setAvailable(false);
      }
      setError(res.error);
      return;
    }

    // On success, navigate to gallery
    navigate('/galeria', { replace: true });
  };

  const score = strengthScore(password);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Background keeps stars and aesthetic through existing GlobalStars in App */}
      <div className="max-w-md w-full mx-4">
        <div className="bg-[hsl(var(--popover))] rounded-2xl p-6 border border-[hsl(var(--border))] shadow-2xl">
          <h1 className="text-xl font-semibold mb-2">{es ? 'Completa tu cuenta' : 'Complete your account'}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{es ? 'Para continuar, elige un nombre de usuario y una contraseña.' : 'To continue, choose a username and a password.'}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{es ? 'Nombre de usuario' : 'Username'}</label>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">@{username || suggested}</div>
              <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="w-full px-3 py-2 rounded-lg border bg-[hsl(var(--input))]" />
              {available === false && <div className="text-xs text-red-500 mt-1">{es ? 'Nombre de usuario no disponible' : 'Username not available'}</div>}
              {available === true && <div className="text-xs text-green-500 mt-1">{es ? 'Nombre de usuario disponible' : 'Username available'}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{es ? 'Nombre a mostrar' : 'Display name'}</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-[hsl(var(--input))]" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{es ? 'Contraseña' : 'Password'}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-[hsl(var(--input))]" />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-2 top-2 text-sm">{showPw ? (es ? 'Ocultar' : 'Hide') : (es ? 'Mostrar' : 'Show')}</button>
              </div>
              <div className="h-2 bg-[hsl(var(--input))] rounded mt-2 overflow-hidden">
                <div style={{ width: `${(score / 4) * 100}%` }} className={`h-2 ${score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-yellow-400' : 'bg-green-400'}`} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{es ? 'Confirmar contraseña' : 'Confirm password'}</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-[hsl(var(--input))]" />
                <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-2 top-2 text-sm">{showConfirm ? (es ? 'Ocultar' : 'Hide') : (es ? 'Mostrar' : 'Show')}</button>
              </div>
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <div>
              <button disabled={loading} type="submit" className="w-full py-2 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-medium">{loading ? '…' : (es ? 'Continuar' : 'Continue')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
