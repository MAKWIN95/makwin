import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, password } = req.body as { userId?: string; password?: string };
    if (!userId || !password) return res.status(400).json({ error: 'userId and password required' });

    const authHeader = (req.headers['authorization'] as string | undefined) || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || '';

    if (!token) return res.status(401).json({ error: 'Missing access token' });

    // Verify the caller's token belongs to the requested user
    try {
      const userRes: any = await supabaseAdmin.auth.getUser(token);
      const remoteUser = userRes?.data?.user || userRes?.user || null;
      if (!remoteUser || remoteUser.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch (err) {
      console.error('[ADMIN-SET-PW] Failed to validate token:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
      return res.status(400).json({ error: 'La contraseña no es válida' });
    }

    // Only for the first-time setup of a Google account. Afterwards a password
    // can only change through the emailed reset link, so an open session alone
    // can never take over an account.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('google_setup_completed')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.google_setup_completed) return res.status(403).json({ error: 'Forbidden' });

    // Use admin API to update user password without triggering public emails
    try {
      // admin.updateUserById returns { data, error }
      const updateRes: any = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (updateRes?.error) {
        console.error('[ADMIN-SET-PW] Admin update error:', updateRes.error);
        return res.status(500).json({ error: updateRes.error.message || 'Failed to update password' });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[ADMIN-SET-PW] Exception updating password:', err);
      return res.status(500).json({ error: 'Failed to update password' });
    }
  } catch (err) {
    console.error('[ADMIN-SET-PW] Exception:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
