import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { getAuthErrorMessage } from '@/lib/authErrors';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type Mode = 'login' | 'forgot';

export default function Login() {
  const { user, loading: authLoading, signInWithEmail, signInWithGoogle, signInWithGoogleToken, resetPassword } = useAuth();
  const { language } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const es = language === 'es';

  // Email confirmation links land here with a fresh session; a signed-in user
  // has nothing to do on the login form.
  useEffect(() => {
    if (!authLoading && user) navigate('/galeria', { replace: true });
  }, [authLoading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsConfirmation(false);
    setConfirmationSent(false);
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      // Parse error codes and show user-friendly messages
      if (error === 'USER_NOT_FOUND') {
        setError(es
          ? 'Este correo no está registrado. ¿Quieres crear una cuenta?'
          : 'This email is not registered. Would you like to create an account?');
      } else if (error === 'INVALID_PASSWORD') {
        setError(es
          ? 'Contraseña incorrecta.'
          : 'Incorrect password.');
      } else if (error === 'INVALID_CREDENTIALS') {
        setError(es
          ? 'Email o contraseña incorrectos.'
          : 'Incorrect email or password.');
      } else if (error.includes('Email not confirmed') || error.includes('not confirmed')) {
        setError(es
          ? 'Verifica tu correo electrónico. No hemos confirmado tu cuenta aún.'
          : 'Please verify your email. We haven\'t confirmed your account yet.');
        setNeedsConfirmation(true);
      } else {
        setError(getAuthErrorMessage(error, language));
      }
    } else {
      navigate('/galeria');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(getAuthErrorMessage(error, language));
    } else {
      setResetSent(true);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err, language));
      setLoading(false);
    }
  };

  const handleGoogleToken = async (token: string, nonce: string) => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogleToken(token, nonce);
    } catch (err) {
      setError(getAuthErrorMessage(err, language));
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    setLoading(false);
    if (error) {
      setError(getAuthErrorMessage(error, language));
    } else {
      setError('');
      setConfirmationSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4">
      {/* Stars background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 0.5}px`,
            height: `${Math.random() * 2 + 0.5}px`,
            '--duration': `${Math.random() * 3 + 2}s`,
            '--delay': `${Math.random()}s`,
          } as React.CSSProperties} />
        ))}
      </div>

      <div className="glass-ambient" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm page-enter">
        {/* Logo */}
        <Link to="/" className="block text-center mb-10">
          <span className="text-3xl font-black tracking-widest uppercase text-[hsl(var(--foreground))]">
            MAKWIN
          </span>
        </Link>

        <div className="glass-panel p-8">

          {mode === 'login' && (
            <>
              <h1 className="text-xl font-light mb-6 text-[hsl(var(--foreground))]">
                {es ? 'Iniciar sesión' : 'Sign in'}
              </h1>

              {/* Google */}
              <GoogleSignInButton
                language={es ? 'es' : 'en'}
                disabled={loading}
                onRedirect={handleGoogle}
                onToken={handleGoogleToken}
              />

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{es ? 'o' : 'or'}</span>
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder={es ? 'Correo electrónico' : 'Email'}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                />
                <input
                  type="password"
                  placeholder={es ? 'Contraseña' : 'Password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                />

                {error && <p className="text-sm text-red-500">{error}</p>}
                {needsConfirmation && !confirmationSent && (
                  <button type="button" onClick={handleResendConfirmation} disabled={loading} className="tap-area text-sm text-[hsl(var(--foreground))] underline underline-offset-2 disabled:opacity-50">
                    {es ? 'Reenviar correo de confirmación' : 'Resend confirmation email'}
                  </button>
                )}
                {confirmationSent && (
                  <p role="status" className="text-sm text-[hsl(var(--foreground))]">
                    {es ? 'Te lo hemos enviado de nuevo. Revisa tu bandeja de entrada.' : 'We sent it again. Check your inbox.'}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full glass-button glass-button--primary"
                >
                  {loading ? '…' : (es ? 'Entrar' : 'Sign in')}
                </button>
              </form>

              <button
                onClick={() => { setMode('forgot'); setError(''); }}
                className="w-full text-center text-xs phone:text-sm phone:min-h-11 phone:mt-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mt-4 transition-colors"
              >
                {es ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
              </button>

              <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
                {es ? '¿No tienes cuenta?' : "Don't have an account?"}{' '}
                <Link to="/registro" className="tap-area text-[hsl(var(--foreground))] underline underline-offset-2">
                  {es ? 'Registrarse' : 'Sign up'}
                </Link>
              </p>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <button
                onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-5 flex items-center gap-1 transition-colors"
              >
                ← {es ? 'Volver' : 'Back'}
              </button>

              <h1 className="text-xl font-light mb-2 text-[hsl(var(--foreground))]">
                {es ? 'Recuperar contraseña' : 'Reset password'}
              </h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                {es
                  ? 'Te enviaremos un enlace para restablecer tu contraseña.'
                  : "We'll send you a link to reset your password."}
              </p>

              {resetSent ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">📬</div>
                  <p className="text-sm text-[hsl(var(--foreground))]">
                    {es
                      ? 'Revisa tu bandeja de entrada.'
                      : 'Check your inbox.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <input
                    type="email"
                    placeholder={es ? 'Correo electrónico' : 'Email'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full glass-button glass-button--primary"
                  >
                    {loading ? '…' : (es ? 'Enviar enlace' : 'Send link')}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
