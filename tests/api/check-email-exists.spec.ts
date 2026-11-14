import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ listUsers: vi.fn(), from: vi.fn() }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { admin: { listUsers: auth.listUsers } }, from: auth.from }),
}));
vi.mock('../../server/lib/username-availability.js', () => ({ getUsernameAvailability: vi.fn() }));

import handler, { checkEmailExists } from '../../api/check-email-exists';

function createResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response;
}

const users = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, i) => ({ id: `u${offset + i}`, email: `user${offset + i}@example.com` }));

// Two pages: a full first page of 1000 users and a partial second page.
function mockTwoPages() {
  auth.listUsers.mockImplementation(async ({ page }: { page: number }) => ({
    data: { users: page === 1 ? users(1000) : users(5, 1000) },
    error: null,
  }));
}

const search = vi.fn();
vi.stubGlobal('fetch', search);
const found = (list: { email: string }[]) => ({ ok: true, json: async () => ({ users: list }) });

describe('check email exists API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Unless a test says otherwise, the search by address is down and the full walk answers.
    search.mockRejectedValue(new Error('search unavailable'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('asks Auth for the one address instead of downloading everyone', async () => {
    search.mockResolvedValue(found([{ email: 'ana@example.com' }]));
    const response = createResponse();

    await handler({ method: 'POST', body: { email: ' Ana@Example.com ' } } as any, response);

    expect(response.body).toEqual({ exists: true });
    expect(String(search.mock.calls[0][0])).toContain('filter=ana%40example.com');
    expect(auth.listUsers).not.toHaveBeenCalled();
  });

  it('does not take a longer address that contains this one as a match', async () => {
    search.mockResolvedValue(found([{ email: 'xana@example.com' }, { email: 'ana@example.com.es' }]));
    const response = createResponse();

    await handler({ method: 'POST', body: { email: 'ana@example.com' } } as any, response);

    expect(response.body).toEqual({ exists: false });
    expect(auth.listUsers).not.toHaveBeenCalled();
  });

  it('walks every page when Auth answers the search with an error', async () => {
    search.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    mockTwoPages();
    const response = createResponse();

    await handler({ method: 'POST', body: { email: 'user1003@example.com' } } as any, response);

    expect(response.body).toEqual({ exists: true });
    expect(auth.listUsers).toHaveBeenCalledTimes(2);
  });

  it('finds emails beyond the first Auth page, case-insensitively', async () => {
    mockTwoPages();
    const response = createResponse();

    await handler({ method: 'POST', body: { email: ' USER1003@Example.com ' } } as any, response);

    expect(response.body).toEqual({ exists: true });
    expect(auth.listUsers).toHaveBeenCalledTimes(2);
    expect(auth.from).not.toHaveBeenCalled();
  });

  it('reports unknown emails after scanning every page', async () => {
    mockTwoPages();
    const response = createResponse();

    await handler({ method: 'POST', body: { email: 'nobody@example.com' } } as any, response);

    expect(response.body).toEqual({ exists: false });
    expect(auth.listUsers).toHaveBeenCalledTimes(2);
  });

  it('returns an error instead of "not found" when Auth fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    auth.listUsers.mockResolvedValue({ data: { users: [] }, error: new Error('auth unavailable') });

    const response = createResponse();
    await handler({ method: 'POST', body: { email: 'user1@example.com' } } as any, response);
    const helper = await checkEmailExists({ body: JSON.stringify({ email: 'user1@example.com' }) });

    expect(response.statusCode).toBe(500);
    expect(helper.statusCode).toBe(500);
    consoleError.mockRestore();
  });
});
