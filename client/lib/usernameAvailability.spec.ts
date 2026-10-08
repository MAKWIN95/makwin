import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkUsernameAvailability } from './usernameAvailability';

describe('username availability', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('distinguishes available and taken usernames', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: false }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await checkUsernameAvailability(' Artist ')).toBe('available');
    expect(await checkUsernameAvailability('occupied')).toBe('taken');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: 'username-availability', username: 'artist' });
  });

  it('reports endpoint errors instead of treating them as occupied', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 405 })));
    expect(await checkUsernameAvailability('artist')).toBe('error');
  });
});
