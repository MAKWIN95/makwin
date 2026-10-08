export const MIN_PASSWORD_LENGTH = 8;

export function getPasswordStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (/\s/.test(password)) {
    return 'La contraseña no puede contener espacios.';
  }
  return null;
}

export function isPasswordValid(password: string): boolean {
  return getPasswordPolicyError(password) === null;
}
