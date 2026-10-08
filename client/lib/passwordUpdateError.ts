export function getPasswordUpdateErrorMessage(error: unknown, language: 'es' | 'en' = 'es'): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'same_password') {
    return language === 'es'
      ? 'No puedes usar tu contraseña actual como nueva contraseña.'
      : 'You cannot reuse your current password.';
  }

  return language === 'es'
    ? 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'
    : 'The password could not be changed. Please try again.';
}
