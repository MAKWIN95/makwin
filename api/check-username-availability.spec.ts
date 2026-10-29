import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const availability = vi.hoisted(() => ({
  getUsernameAvailability: vi.fn(),
  getUsernameAvailabilityUserId: vi.fn(),
}));

vi.mock('../server/lib/username-availability.js', () => availability);

import handler from './check-username-availability';

function createResponse() {
  const response: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return response;
}

describe('username availability API', () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a new valid username and rejects an existing one', async () => {
    availability.getUsernameAvailability.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const availableResponse = createResponse();
    const takenResponse = createResponse();

    await handler({ method: 'POST', body: { username: 'newartist' }, headers: {} } as any, availableResponse);
    await handler({ method: 'POST', body: { username: 'existing' }, headers: {} } as any, takenResponse);

    expect(availableResponse.body).toEqual({ available: true });
    expect(takenResponse.body).toEqual({ available: false });
  });

  it('excludes the authenticated incomplete Google profile from conflicts', async () => {
    availability.getUsernameAvailabilityUserId.mockResolvedValue('google-user-id');
    availability.getUsernameAvailability.mockResolvedValue(true);
    const response = createResponse();

    await handler({
      method: 'POST',
      body: { username: 'myreservedname' },
      headers: { authorization: 'Bearer valid-session-token' },
    } as any, response);

    expect(availability.getUsernameAvailabilityUserId).toHaveBeenCalledWith('valid-session-token');
    expect(availability.getUsernameAvailability).toHaveBeenCalledWith('myreservedname', 'google-user-id');
    expect(response.body).toEqual({ available: true });
  });

  it('distinguishes invalid input and real backend/authentication errors', async () => {
    const invalid = createResponse();
    await handler({ method: 'POST', body: { username: 'x' }, headers: {} } as any, invalid);
    expect(invalid.statusCode).toBe(400);
    expect(availability.getUsernameAvailability).not.toHaveBeenCalled();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    availability.getUsernameAvailability.mockRejectedValueOnce(new Error('database unavailable'));
    const failedQuery = createResponse();
    await handler({ method: 'POST', body: { username: 'validname' }, headers: {} } as any, failedQuery);
    expect(failedQuery.statusCode).toBe(500);
    expect(failedQuery.body).toEqual({ error: 'Unable to verify username availability.' });

    availability.getUsernameAvailabilityUserId.mockRejectedValueOnce(new Error('invalid token'));
    const failedAuth = createResponse();
    await handler({
      method: 'POST', body: { username: 'validname' },
      headers: { authorization: 'Bearer invalid-token' },
    } as any, failedAuth);
    expect(failedAuth.statusCode).toBe(401);
    consoleError.mockRestore();
  });
});
