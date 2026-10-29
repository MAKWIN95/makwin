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

// handle_new_user gives sign-ups without a chosen username (Google) `user_`
// plus their id until onboarding replaces it.
export function isPlaceholderUsername(value: unknown): boolean {
  return /^user_[0-9a-f]{32}$/.test(String(value ?? ''));
}
