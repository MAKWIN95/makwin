export function getPasswordUpdateErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'same_password') {
    return 'No puedes usar tu contraseña actual como nueva contraseña.';
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message || 'Error al cambiar la contraseña.';
  }

  return 'Error al cambiar la contraseña.';
}
