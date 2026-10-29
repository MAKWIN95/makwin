import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUsernameAvailability } from '../server/lib/username-availability.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
);

export { getUsernameAvailability } from '../server/lib/username-availability.js';

const AUTH_USERS_PAGE_SIZE = 1000;

// Emails live only in Supabase Auth (profiles has no email column), and
// listUsers is paginated, so walk every page instead of only the first one.
export async function authEmailExists(email: string): Promise<boolean> {
  const target = email.trim().toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: AUTH_USERS_PAGE_SIZE });
    if (error) throw error;
    const users = data?.users || [];
    if (users.some((u) => (u.email || '').toLowerCase() === target)) return true;
    if (users.length < AUTH_USERS_PAGE_SIZE) return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const requestBody = req.body as { action?: string; username?: string; email?: string };
    if (requestBody?.action === 'username-availability') {
      if (!requestBody.username) return res.status(400).json({ error: 'Username required' });
      const available = await getUsernameAvailability(requestBody.username);
      return res.status(200).json({ available });
    }

    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
      return res.status(200).json({ exists: await authEmailExists(email) });
    } catch (e) {
      console.error('[CHECK-EMAIL] Auth listUsers failed:', e);
      return res.status(500).json({ error: 'Failed to check email' });
    }
  } catch (err) {
    console.error('[CHECK-EMAIL] Exception:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

// Backwards-compatible helper: returns { statusCode, body } for internal server use
export async function checkEmailExists(event: any) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const email = body?.email;
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
    }

    try {
      return { statusCode: 200, body: JSON.stringify({ exists: await authEmailExists(email) }) };
    } catch (e) {
      console.error('[CHECK-EMAIL] Auth listUsers failed:', e);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to check email' }) };
    }
  } catch (err) {
    console.error('[CHECK-EMAIL] Exception:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
}
