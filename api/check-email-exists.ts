import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ error: 'Email required' });

    // Try to find email in profiles table first
    try {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', (email || '').toLowerCase())
        .limit(1);

      if (!error) {
        const exists = Array.isArray(profiles) ? profiles.length > 0 : !!profiles;
        return res.status(200).json({ exists });
      }
    } catch (e) {
      console.warn('[CHECK-EMAIL] profiles query failed, will fallback to auth listUsers', e?.message || e);
    }

    // Fallback: search in Auth users list
    try {
      const listRes: any = await supabaseAdmin.auth.admin.listUsers();
      const users = listRes?.data?.users || listRes?.users || [];
      const found = users.find((u: any) => (u.email || '').toLowerCase() === (email || '').toLowerCase());
      return res.status(200).json({ exists: !!found });
    } catch (e) {
      console.error('[CHECK-EMAIL] Fallback listUsers failed:', e);
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

    // Try to find email in profiles table first
    try {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', (email || '').toLowerCase())
        .limit(1);

      if (!error) {
        const exists = Array.isArray(profiles) ? profiles.length > 0 : !!profiles;
        return { statusCode: 200, body: JSON.stringify({ exists }) };
      }
    } catch (e) {
      console.warn('[CHECK-EMAIL] profiles query failed, will fallback to auth listUsers', e?.message || e);
    }

    // Fallback: search in Auth users list
    try {
      const listRes: any = await supabaseAdmin.auth.admin.listUsers();
      const users = listRes?.data?.users || listRes?.users || [];
      const found = users.find((u: any) => (u.email || '').toLowerCase() === (email || '').toLowerCase());
      return { statusCode: 200, body: JSON.stringify({ exists: !!found }) };
    } catch (e) {
      console.error('[CHECK-EMAIL] Fallback listUsers failed:', e);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to check email' }) };
    }
  } catch (err) {
    console.error('[CHECK-EMAIL] Exception:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
}
