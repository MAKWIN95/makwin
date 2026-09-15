import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = (req.headers.authorization || req.headers.Authorization || '') as string;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { userId, password } = body || {};
    if (!userId || !password) return res.status(400).json({ error: 'Missing parameters' });

    // Validate token belongs to the targeted user
    const getUserRes: any = await supabaseAdmin.auth.getUser(token);
    if (getUserRes?.error) {
      console.error('[ADMIN-SET-PASSWORD] getUser failed:', getUserRes.error);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenUser = getUserRes?.data?.user || getUserRes?.user;
    if (!tokenUser || tokenUser.id !== userId) {
      console.warn('[ADMIN-SET-PASSWORD] token user mismatch', { tokenUser: tokenUser?.id, userId });
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Perform admin password change using service role
    try {
    // supabase-js v2 exposes admin API under auth.admin
    if (supabaseAdmin.auth && (supabaseAdmin.auth as any).admin && (supabaseAdmin.auth as any).admin.updateUserById) {
      const upd: any = await (supabaseAdmin.auth as any).admin.updateUserById(userId, { password });
      if (upd?.error) {
        console.error('[ADMIN-SET-PASSWORD] admin.updateUserById error:', upd.error);
        return res.status(500).json({ error: 'Failed to set password' });
      }

      return res.status(200).json({ ok: true });
    }

    console.error('[ADMIN-SET-PASSWORD] admin.updateUserById not available on this runtime');
    return res.status(501).json({ error: 'Not supported' });
    } catch (e: any) {
    console.error('[ADMIN-SET-PASSWORD] Exception while updating password:', e?.message || e);
    return res.status(500).json({ error: 'Failed to set password' });
    }
  } catch (err: any) {
    console.error('[ADMIN-SET-PASSWORD] Exception:', err?.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
}
