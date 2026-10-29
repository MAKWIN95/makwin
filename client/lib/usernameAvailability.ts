import { isValidUsername, normalizeUsername } from '@shared/username';

export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

export async function checkUsernameAvailability(username: string, accessToken?: string): Promise<UsernameAvailability> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) return 'invalid';

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch('/api/check-username-availability', {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: normalized }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload.available !== 'boolean') {
      console.error(`[usernameAvailability] Endpoint failed with HTTP ${response.status}`);
      return 'error';
    }
    return payload.available ? 'available' : 'taken';
  } catch (error) {
    console.error('[usernameAvailability] Error checking username:', error);
    return 'error';
  }
}
