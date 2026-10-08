export type UsernameAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';

export async function checkUsernameAvailability(username: string): Promise<UsernameAvailability> {
  const normalized = String(username || '').trim().toLowerCase();
  if (!normalized) return 'error';

  try {
    const response = await fetch('/api/check-email-exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'username-availability', username: normalized }),
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
