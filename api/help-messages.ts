import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAdminRequest } from '../server/lib/admin-auth.js';

// help_messages has no SELECT/UPDATE/DELETE RLS policies (they contain
// user emails), so the admin panel manages them through this endpoint.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const STATUSES = ['new', 'read', 'resolved'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!(await isAdminRequest(req.headers.authorization))) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('help_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ messages: data || [] });
    }

    const { id, status } = (req.body || {}) as { id?: string; status?: string };
    if (!id) return res.status(400).json({ error: 'id requerido' });

    if (req.method === 'PATCH') {
      if (!STATUSES.includes(status || '')) return res.status(400).json({ error: 'Estado inválido' });
      const { error } = await supabaseAdmin
        .from('help_messages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin.from('help_messages').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[HELP-MESSAGES] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
