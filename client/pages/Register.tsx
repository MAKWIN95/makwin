import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';

export default function Register() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const { language } = useI18n();
  const navigate = useNavigate();
  const es = language === 'es';

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!form.email || !form.password || !form.username || !form.displayName)
      return es ? 'Rellena todos los campos.' : 'Fill in all fields.';
    if (form.password !== form.confirmPassword)
      return es ? 'Las contraseñas no coinciden.' : 'Passwords do not match.';
    if (form.password.length < 8)
      return es ? 'La contraseña debe tener al menos 8 caracteres.' : 'Password must be at least 8 characters.';
    if (!/^[a-z0-9_]+$/.test(form.username.toLowerCase()))
      return es ? 'El nombre de usuario solo puede contener letras, números y guion bajo.' : 'Username can only contain letters, numbers and underscores.';
    if (form.username.length < 3 || form.username.length > 24)
      return es ? 'El nombre de usuario debe tener entre 3 y 24 caracteres.' : 'Username must be 3–24 characters.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoading(true);
    const { error } = await signUpWithEmail(form.email, form.password, form.username, form.displayName);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all";

  if (success) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-6">✉️</div>
          <h1 className="text-2xl font-light mb-3 text-[hsl(var(--foreground))]">
            {es ? 'Revisa tu email' : 'Check your email'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
            {es
              ? `Hemos enviado un enlace de confirmación a ${form.email}. Haz clic en él para activar tu cuenta.`
              : `We sent a confirmation link to ${form.email}. Click it to activate your account.`}
          </p>
          <Link to="/login" className="text-sm text-[hsl(var(--foreground))] underline underline-offset-2">
            {es ? 'Ir al inicio de sesión' : 'Go to login'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4 py-12">
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

      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="block text-center mb-10">
          <span className="text-3xl font-black tracking-widest uppercase text-[hsl(var(--foreground))]">MAKWIN</span>
        </Link>

        <div className="bg-[hsl(var(--popover))/0.8] backdrop-blur-xl border border-[hsl(var(--border))] rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-light mb-6 text-[hsl(var(--foreground))]">
            {es ? 'Crear cuenta' : 'Create account'}
          </h1>

          {/* Google */}
          <button
            onClick={async () => { setLoading(true); await signInWithGoogle(); }}
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

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" name="displayName" placeholder={es ? 'Tu nombre' : 'Your name'}
              value={form.displayName} onChange={handleChange} required className={inputClass} />

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">@</span>
              <input type="text" name="username"
                placeholder={es ? 'nombre_usuario' : 'username'}
                value={form.username}
                onChange={e => setForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                required
                className={`${inputClass} pl-8`}
              />
            </div>

            <input type="email" name="email" placeholder={es ? 'Correo electrónico' : 'Email'}
              value={form.email} onChange={handleChange} required className={inputClass} />

            <input type="password" name="password" placeholder={es ? 'Contraseña (mín. 8 caracteres)' : 'Password (min. 8 chars)'}
              value={form.password} onChange={handleChange} required className={inputClass} />

            <input type="password" name="confirmPassword" placeholder={es ? 'Repetir contraseña' : 'Confirm password'}
              value={form.confirmPassword} onChange={handleChange} required className={inputClass} />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {loading ? '…' : (es ? 'Crear cuenta' : 'Create account')}
            </button>
          </form>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
            {es ? '¿Ya tienes cuenta?' : 'Already have an account?'}{' '}
            <Link to="/login" className="text-[hsl(var(--foreground))] underline underline-offset-2">
              {es ? 'Iniciar sesión' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
