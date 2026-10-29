export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

export function normalizeUsername(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidUsername(value: unknown): boolean {
  const username = normalizeUsername(value);
  return username.length >= USERNAME_MIN_LENGTH
    && username.length <= USERNAME_MAX_LENGTH
    && /^[a-z0-9](?:[a-z0-9_.]*[a-z0-9])?$/.test(username);
}

export function isUsernameUniqueViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (error?.code !== '23505') return false;
  const message = String(error?.message ?? '').toLowerCase();
  return message.includes('duplicate key') && message.includes('username');
}
