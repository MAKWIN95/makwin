// Supabase and our own auth helpers report errors in English or as codes; people
// should always read them in the language they chose.
export function getAuthErrorMessage(error: unknown, language: 'es' | 'en'): string {
  const es = language === 'es';
  const raw = typeof error === 'string' ? error : (error as { message?: string })?.message ?? '';
  const message = raw.toLowerCase();

  if (message.includes('username_taken') || message.includes('profiles_username') || message.includes('database error saving new user')) {
    return es ? 'Este nombre de usuario ya está en uso.' : 'This username is already in use.';
  }
  if (message.includes('invalid_username')) {
    return es
      ? 'El nombre de usuario debe tener entre 3 y 24 caracteres: letras, números, puntos y guion bajo.'
      : 'Usernames must be 3–24 characters: letters, numbers, dots and underscores.';
  }
  if (message.includes('already registered') || message.includes('already exists')) {
    return es ? 'Este correo ya tiene una cuenta. Inicia sesión.' : 'This email already has an account. Please sign in.';
  }
  if (message.includes('rate limit') || message.includes('too many') || message.includes('security purposes')) {
    return es ? 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' : 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('same_password') || message.includes('different from the old')) {
    return es ? 'No puedes usar tu contraseña actual como nueva contraseña.' : 'You cannot reuse your current password.';
  }
  if (message.includes('password')) {
    return es ? 'La contraseña no es válida. Usa al menos 8 caracteres, sin espacios.' : 'That password is not valid. Use at least 8 characters, no spaces.';
  }
  if (message.includes('invalid email') || message.includes('email address') || message.includes('unable to validate email')) {
    return es ? 'Revisa la dirección de correo.' : 'Please check the email address.';
  }
  if (message.includes('session') || message.includes('jwt') || message.includes('no_session')) {
    return es ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.' : 'Your session has expired. Please sign in again.';
  }
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return es ? 'Problema de conexión. Inténtalo de nuevo.' : 'Connection problem. Please try again.';
  }
  return es ? 'Algo ha fallado. Inténtalo de nuevo.' : 'Something went wrong. Please try again.';
}
