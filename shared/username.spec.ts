import { describe, expect, it } from 'vitest';
import { isValidUsername, isUsernameUniqueViolation, normalizeUsername } from './username';

describe('shared username rules', () => {
  it('normalizes and validates the username format consistently', () => {
    expect(normalizeUsername(' Artist_One ')).toBe('artist_one');
    expect(isValidUsername('artist_one')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('artist!')).toBe(false);
    expect(isValidUsername('a'.repeat(25))).toBe(false);
  });

  it('identifies only username uniqueness conflicts', () => {
    expect(isUsernameUniqueViolation({ code: '23505', message: 'duplicate key violates profiles_username_key' })).toBe(true);
    expect(isUsernameUniqueViolation({ code: '23505', message: 'duplicate key violates profiles_pkey' })).toBe(false);
    expect(isUsernameUniqueViolation({ code: '42501', message: 'permission denied' })).toBe(false);
  });
});
