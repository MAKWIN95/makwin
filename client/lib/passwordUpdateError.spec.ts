import { describe, expect, it } from 'vitest';
import { getPasswordUpdateErrorMessage } from './passwordUpdateError';

describe('password update errors', () => {
  it('maps same-password errors to a safe, localized message', () => {
    expect(getPasswordUpdateErrorMessage({
      code: 'same_password',
      message: 'New password should be different from the old password.',
    })).toBe('No puedes usar tu contraseña actual como nueva contraseña.');
    expect(getPasswordUpdateErrorMessage({ code: 'same_password' }, 'en')).toBe('You cannot reuse your current password.');
  });

  it('does not expose raw provider errors and falls back in the selected language', () => {
    expect(getPasswordUpdateErrorMessage({ code: 'unexpected', message: 'Request failed.' })).toBe('No se pudo cambiar la contraseña. Inténtalo de nuevo.');
    expect(getPasswordUpdateErrorMessage({ code: 'unexpected', message: 'Request failed.' }, 'en')).toBe('The password could not be changed. Please try again.');
    expect(getPasswordUpdateErrorMessage(null)).toBe('No se pudo cambiar la contraseña. Inténtalo de nuevo.');
  });
});
