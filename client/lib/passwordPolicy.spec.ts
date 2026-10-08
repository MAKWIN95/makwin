import { describe, expect, it } from 'vitest';
import { getPasswordPolicyError, getPasswordStrengthScore, isPasswordValid } from './passwordPolicy';

describe('password policy', () => {
  it('requires at least eight characters and rejects whitespace', () => {
    expect(getPasswordPolicyError('Short7!')).toContain('8');
    expect(getPasswordPolicyError('Long enough 7!')).toContain('espacios');
    expect(isPasswordValid('LongEnough7!')).toBe(true);
  });

  it('uses the onboarding strength signals', () => {
    expect(getPasswordStrengthScore('abcdefgh')).toBe(1);
    expect(getPasswordStrengthScore('Abcdefg8!')).toBe(4);
  });
});
