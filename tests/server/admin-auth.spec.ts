import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: auth.getUser } }),
}));

import { isAdminRequest } from '../../server/lib/admin-auth';

const userWithEmail = (email: string) => ({ data: { user: { id: 'u1', email } }, error: null });

describe('isAdminRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_EMAILS', ' Admin@Makwin.art , second@example.com');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('accepts a valid session whose email is listed, case-insensitively', async () => {
    auth.getUser.mockResolvedValue(userWithEmail('admin@makwin.art'));
    await expect(isAdminRequest('Bearer token-1')).resolves.toBe(true);
    expect(auth.getUser).toHaveBeenCalledWith('token-1');
  });

  it('rejects other users, invalid tokens and missing tokens', async () => {
    auth.getUser.mockResolvedValueOnce(userWithEmail('artist@example.com'));
    await expect(isAdminRequest('Bearer token-2')).resolves.toBe(false);

    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid JWT') });
    await expect(isAdminRequest('Bearer expired')).resolves.toBe(false);

    await expect(isAdminRequest(undefined)).resolves.toBe(false);
    expect(auth.getUser).toHaveBeenCalledTimes(2);
  });

  it('fails closed when no admin emails are configured', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    auth.getUser.mockResolvedValue(userWithEmail('admin@makwin.art'));
    await expect(isAdminRequest('Bearer token-1')).resolves.toBe(false);
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});
