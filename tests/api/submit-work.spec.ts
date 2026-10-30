import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({ redis: { set: vi.fn() } }));
const resendMock = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('../../server/lib/redis.js', () => redisMock);
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendMock.send };
  },
}));

import handler from '../../api/submit-work';

function createResponse() {
  const response: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
    json(body: unknown) { this.body = body; return this; },
    end() { return this; },
  };
  return response;
}

const submission = {
  artistName: 'Test Artist',
  email: 'artist@example.com',
  workType: 'pintura',
  title: 'Obra de prueba',
  description: 'Descripción',
};

describe('submit work API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    vi.stubEnv('RESEND_FROM', 'MAKWIN <no-reply@example.test>');
    vi.stubEnv('HELP_EMAIL', 'help@example.test');
    vi.stubEnv('ARTISTS_EMAIL', 'artists@example.test');
    resendMock.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });
  });

  it('is retired: stores nothing and sends no emails', async () => {
    const response = createResponse();

    await handler({ method: 'POST', body: submission, headers: {} } as any, response);

    expect(response.statusCode).toBe(410);
    expect(redisMock.redis.set).not.toHaveBeenCalled();
    expect(resendMock.send).not.toHaveBeenCalled();
  });
});
