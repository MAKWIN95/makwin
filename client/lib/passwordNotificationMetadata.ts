export type PasswordNotificationLanguage = 'es' | 'en';

export function withPasswordNotificationLanguage(
  userMetadata: Record<string, unknown> | null | undefined,
  language: PasswordNotificationLanguage,
): Record<string, unknown> {
  return {
    ...userMetadata,
    language_preference: language,
  };
}
