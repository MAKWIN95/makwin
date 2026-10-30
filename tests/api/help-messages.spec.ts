import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = { calls: [] as string[][], insertRow: null as any, result: { data: [] as any, error: null as any } };
  const builder: any = {};
  for (const method of ['select', 'order', 'update', 'delete', 'eq', 'insert', 'single']) {
    builder[method] = vi.fn((...args: any[]) => {
      state.calls.push([method, ...args.map((a) => JSON.stringify(a))]);
      if (method === 'insert') state.insertRow = args[0];
      return builder;
    });
  }
  builder.then = (resolve: any) => resolve(state.result);
  return { state, builder, from: vi.fn(() => builder) };
});
const authMock = vi.hoisted(() => ({ isAdminRequest: vi.fn(), getRequestUser: vi.fn() }));
const resendMock = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: db.from }) }));
vi.mock('../../server/lib/admin-auth.js', () => authMock);
vi.mock('resend', () => ({ Resend: class { emails = { send: resendMock.send }; } }));

import helpMessages from '../../api/help-messages';
import saveHelpMessage from '../../api/save-help-message';

function createResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response;
}

const validMessage = {
  email: 'artist@example.com',
  name: 'Artist',
  category: 'soporte',
  subject: 'No puedo subir',
  message: 'La subida de mi obra falla siempre.',
};

describe('admin help messages API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.state.calls = [];
    db.state.result = { data: [], error: null };
  });

  it('rejects non-admins before touching the database', async () => {
    authMock.isAdminRequest.mockResolvedValue(false);
    const response = createResponse();

    await helpMessages({ method: 'GET', headers: {} } as any, response);

    expect(response.statusCode).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
  });

  it('lists, updates and deletes messages for admins', async () => {
    authMock.isAdminRequest.mockResolvedValue(true);
    db.state.result = { data: [{ id: 'm1', status: 'new' }], error: null };

    const list = createResponse();
    await helpMessages({ method: 'GET', headers: { authorization: 'Bearer admin' } } as any, list);
    expect(list.body).toEqual({ messages: [{ id: 'm1', status: 'new' }] });

    const invalid = createResponse();
    await helpMessages({ method: 'PATCH', headers: {}, body: { id: 'm1', status: 'hacked' } } as any, invalid);
    expect(invalid.statusCode).toBe(400);

    const update = createResponse();
    await helpMessages({ method: 'PATCH', headers: {}, body: { id: 'm1', status: 'resolved' } } as any, update);
    expect(update.statusCode).toBe(200);

    const remove = createResponse();
    await helpMessages({ method: 'DELETE', headers: {}, body: { id: 'm1' } } as any, remove);
    expect(remove.statusCode).toBe(200);
    expect(db.state.calls).toContainEqual(['delete']);
    expect(db.state.calls).toContainEqual(['eq', '"id"', '"m1"']);
  });
});

describe('save help message API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM', 'MAKWIN <no-reply@example.test>');
    vi.stubEnv('HELP_EMAIL', 'help@example.test');
    vi.stubEnv('ARTISTS_EMAIL', 'artists@example.test');
    db.state.insertRow = null;
    db.state.result = { data: { id: 'new-id' }, error: null };
    resendMock.send.mockResolvedValue({ data: { id: 'email' }, error: null });
  });

  it('links the message to the verified session user, not to a user_id from the body', async () => {
    authMock.getRequestUser.mockResolvedValue({ id: 'session-user' });
    const response = createResponse();

    await saveHelpMessage({
      method: 'POST',
      headers: { authorization: 'Bearer user-token' },
      body: { ...validMessage, user_id: 'someone-else' },
    } as any, response);

    expect(response.statusCode).toBe(200);
    expect(db.state.insertRow.user_id).toBe('session-user');
    expect(resendMock.send).toHaveBeenCalledTimes(1);
  });

  it('stores anonymous messages without a user and rejects oversized fields', async () => {
    authMock.getRequestUser.mockResolvedValue(null);
    const anonymous = createResponse();
    await saveHelpMessage({ method: 'POST', headers: {}, body: { ...validMessage, user_id: 'spoofed' } } as any, anonymous);
    expect(db.state.insertRow.user_id).toBeNull();

    const tooLong = createResponse();
    await saveHelpMessage({ method: 'POST', headers: {}, body: { ...validMessage, name: 'x'.repeat(101) } } as any, tooLong);
    expect(tooLong.statusCode).toBe(400);
  });
});
