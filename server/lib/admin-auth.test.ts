import { afterEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { roleOf, signedInRecently } from './admin-auth.js';

const user = (fields: Partial<User>) =>
  ({ email: 'someone@example.com', email_confirmed_at: '2026-01-01', app_metadata: {}, user_metadata: {}, ...fields }) as User;

describe('roleOf', () => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = 'Owner@Example.com';
  afterEach(() => {
    process.env.ADMIN_EMAILS = 'Owner@Example.com';
  });

  it('recognises the owner by confirmed email only', () => {
    expect(roleOf(user({ email: 'owner@example.com' }))).toBe('owner');
    expect(roleOf(user({ email: 'owner@example.com', email_confirmed_at: undefined }))).toBeNull();
  });

  it('trusts app_metadata and never user_metadata', () => {
    expect(roleOf(user({ app_metadata: { makwin_admin: true } }))).toBe('admin');
    expect(roleOf(user({ user_metadata: { makwin_admin: true, role: 'admin' } }))).toBeNull();
    expect(roleOf(user({ app_metadata: { makwin_admin: 'true' } }))).toBeNull();
  });

  it('gives nothing to ordinary or missing users', () => {
    expect(roleOf(user({}))).toBeNull();
    expect(roleOf(null)).toBeNull();
    process.env.ADMIN_EMAILS = '';
    expect(roleOf(user({ email: 'owner@example.com' }))).toBeNull();
    process.env.ADMIN_EMAILS = previous;
  });
});

describe('signedInRecently', () => {
  it('requires a sign-in within twelve hours', () => {
    const now = Date.parse('2026-10-30T12:00:00Z');
    expect(signedInRecently(user({ last_sign_in_at: '2026-10-30T01:00:00Z' }), now)).toBe(true);
    expect(signedInRecently(user({ last_sign_in_at: '2026-10-29T23:00:00Z' }), now)).toBe(false);
    expect(signedInRecently(user({ last_sign_in_at: undefined }), now)).toBe(false);
  });
});
