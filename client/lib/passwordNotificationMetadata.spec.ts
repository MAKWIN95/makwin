import { describe, expect, it } from 'vitest';
import { withPasswordNotificationLanguage } from './passwordNotificationMetadata';

describe('password notification metadata', () => {
  it('preserves existing user metadata and stores the effective Spanish locale', () => {
    expect(withPasswordNotificationLanguage({ full_name: 'Makwin', custom: true }, 'es')).toEqual({
      full_name: 'Makwin',
      custom: true,
      language_preference: 'es',
    });
  });

  it('overwrites a stale locale with the current application language', () => {
    expect(withPasswordNotificationLanguage({ language_preference: 'es' }, 'en')).toEqual({
      language_preference: 'en',
    });
  });
});
