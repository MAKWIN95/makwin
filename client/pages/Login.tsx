import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';

type Mode = 'login' | 'forgot';

export default function Login() {
  const { signInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const { language } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const es = language === 'es';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      } else {
        setError(error);
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
      setError(es ? 'Error al enviar el correo.' : 'Error sending email.');
    } else {
      setResetSent(true);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
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

      <div className="relative z-10 w-full max-w-sm page-enter">
        {/* Logo */}
        <Link to="/" className="block text-center mb-10">
          <span className="text-3xl font-black tracking-widest uppercase text-[hsl(var(--foreground))]">
            MAKWIN
          </span>
        </Link>

        <div className="bg-[hsl(var(--popover))/0.8] backdrop-blur-xl border border-[hsl(var(--border))] rounded-2xl p-8 shadow-2xl">

          {mode === 'login' && (
            <>
              <h1 className="text-xl font-light mb-6 text-[hsl(var(--foreground))]">
                {es ? 'Iniciar sesión' : 'Sign in'}
              </h1>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-[hsl(var(--border))] rounded-xl py-3 px-4 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors mb-6"
              >
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                {es ? 'Continuar con Google' : 'Continue with Google'}
              </button>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? '…' : (es ? 'Entrar' : 'Sign in')}
                </button>
              </form>

              <button
                onClick={() => { setMode('forgot'); setError(''); }}
                className="w-full text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mt-4 transition-colors"
              >
                {es ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
              </button>

              <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
                {es ? '¿No tienes cuenta?' : "Don't have an account?"}{' '}
                <Link to="/registro" className="text-[hsl(var(--foreground))] underline underline-offset-2">
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
                    className="w-full py-3 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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
