import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkUsernameAvailability } from './usernameAvailability';

describe('username availability', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('distinguishes available and taken usernames', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: false }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await checkUsernameAvailability(' Artist ', 'session-token')).toBe('available');
    expect(await checkUsernameAvailability('occupied')).toBe('taken');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/check-username-availability');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: 'artist' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer session-token');
  });

  it('rejects empty and invalid usernames without calling the endpoint', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await checkUsernameAvailability('')).toBe('invalid');
    expect(await checkUsernameAvailability('a!b')).toBe('invalid');
    expect(await checkUsernameAvailability('a'.repeat(25))).toBe('invalid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports endpoint errors instead of treating them as occupied', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 405 })));
    expect(await checkUsernameAvailability('artist')).toBe('error');
  });

  it('does not treat an authentication/session error as an occupied username', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    expect(await checkUsernameAvailability('artist', 'expired-session-token')).toBe('error');
  });

  it('does not treat backend failures as occupied usernames', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    expect(await checkUsernameAvailability('artist')).toBe('error');
  });
});
