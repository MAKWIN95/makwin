import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUsernameAvailability, getUsernameAvailabilityUserId } from '../server/lib/username-availability';
import { isValidUsername, normalizeUsername } from '../shared/username';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const username = normalizeUsername((req.body as { username?: unknown } | undefined)?.username);
  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format.' });
  }

  try {
    const authHeader = req.headers.authorization;
    let excludeUserId: string | undefined;
    if (authHeader !== undefined) {
      try {
        if (typeof authHeader !== 'string' || !/^Bearer\s+\S+$/i.test(authHeader)) {
          return res.status(401).json({ error: 'Invalid authentication token.' });
        }
        const accessToken = authHeader.replace(/^Bearer\s+/i, '');
        excludeUserId = await getUsernameAvailabilityUserId(accessToken);
      } catch {
        return res.status(401).json({ error: 'Invalid authentication token.' });
      }
    }
    const available = await getUsernameAvailability(username, excludeUserId);
    return res.status(200).json({ available });
  } catch (error) {
    console.error('[API /api/check-username-availability] Availability query failed:', error);
    return res.status(500).json({ error: 'Unable to verify username availability.' });
  }
}
