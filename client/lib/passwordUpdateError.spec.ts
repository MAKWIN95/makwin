import { describe, expect, it } from 'vitest';
import { getPasswordUpdateErrorMessage } from './passwordUpdateError';

describe('password update errors', () => {
  it('maps Supabase same-password errors to a safe, clear message', () => {
    expect(getPasswordUpdateErrorMessage({
      code: 'same_password',
      message: 'New password should be different from the old password.',
    })).toBe('No puedes usar tu contraseña actual como nueva contraseña.');
  });

  it('preserves non-sensitive error messages and falls back safely', () => {
    expect(getPasswordUpdateErrorMessage({ code: 'unexpected', message: 'Request failed.' })).toBe('Request failed.');
    expect(getPasswordUpdateErrorMessage(null)).toBe('Error al cambiar la contraseña.');
  });
});
