import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  redis: { keys: vi.fn(), get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));
const adminMock = vi.hoisted(() => ({ isAdminRequest: vi.fn() }));

vi.mock('../../server/lib/redis.js', () => redisMock);
vi.mock('../../server/lib/admin-auth.js', () => adminMock);

import getSubmissions from '../../api/get-submissions';
import workAction from '../../api/work-action';

function createResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    setHeader() { return this; },
    json(body: unknown) { this.body = body; return this; },
    end() { return this; },
  };
  return response;
}

const stored: Record<string, object> = {
  '2026-obra-0001': { submissionId: '2026-obra-0001', title: 'Pendiente', email: 'a@example.com', status: 'pending', timestamp: '2026-01-02' },
  '2026-obra-0002': { submissionId: '2026-obra-0002', title: 'Publicada', email: 'b@example.com', status: 'published', timestamp: '2026-01-01' },
};

describe('submission access control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.redis.keys.mockResolvedValue(Object.keys(stored));
    redisMock.redis.get.mockImplementation(async (key: string) => JSON.stringify(stored[key]));
  });

  it('rejects work actions from non-admins without touching Redis', async () => {
    adminMock.isAdminRequest.mockResolvedValue(false);
    const response = createResponse();

    await workAction({ method: 'POST', headers: {}, body: { action: 'delete', submissionId: '2026-obra-0001' } } as any, response);

    expect(response.statusCode).toBe(401);
    expect(redisMock.redis.del).not.toHaveBeenCalled();
    expect(redisMock.redis.set).not.toHaveBeenCalled();
  });

  it('lets admins run work actions', async () => {
    adminMock.isAdminRequest.mockResolvedValue(true);
    const response = createResponse();

    await workAction({
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      body: { action: 'delete', submissionId: '2026-obra-0001' },
    } as any, response);

    expect(adminMock.isAdminRequest).toHaveBeenCalledWith('Bearer admin-token');
    expect(response.statusCode).toBe(200);
    expect(redisMock.redis.del).toHaveBeenCalledWith('2026-obra-0001');
  });

  it('only exposes published submissions without private fields to the public', async () => {
    adminMock.isAdminRequest.mockResolvedValue(false);
    const response = createResponse();

    await getSubmissions({ method: 'GET', headers: {} } as any, response);

    expect(response.body.scope).toBe('public');
    expect(response.body.submissions.map((s: any) => s.submissionId)).toEqual(['2026-obra-0002']);
    expect(response.body.submissions[0]).not.toHaveProperty('email');
  });

  it('returns every submission to admins', async () => {
    adminMock.isAdminRequest.mockResolvedValue(true);
    const response = createResponse();

    await getSubmissions({ method: 'GET', headers: { authorization: 'Bearer admin-token' } } as any, response);

    expect(response.body.scope).toBe('admin');
    expect(response.body.submissions).toHaveLength(2);
    expect(response.body.submissions[0]).toHaveProperty('email', 'a@example.com');
  });
});
