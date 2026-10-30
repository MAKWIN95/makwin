import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestUser, isAdminRequest } from '../server/lib/admin-auth.js';
import { requestBaseUrl, sendEmail, teamEmail } from '../server/lib/email.js';

// policy_reports only lets reporters read their own rows, so moderators and the
// team notification go through this endpoint.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const REASONS: Record<string, string> = {
  porno: 'Contenido +18',
  gore: 'Violencia gráfica',
  spam: 'Spam',
  acoso: 'Acoso o abuso',
  otro: 'Otro',
};

async function createReport(req: VercelRequest, res: VercelResponse) {
  const user = await getRequestUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { workId, reason, details } = (req.body || {}) as { workId?: string; reason?: string; details?: string };
  const cleanDetails = String(details ?? '').trim().slice(0, 1000);
  if (!workId || !reason || !(reason in REASONS) || (reason === 'otro' && !cleanDetails)) {
    return res.status(400).json({ error: 'Datos no válidos' });
  }

  const { data: work } = await supabaseAdmin.from('works').select('id, title').eq('id', workId).maybeSingle();
  if (!work) return res.status(404).json({ error: 'Obra no encontrada' });

  // Reporting twice must not count twice towards the automatic removal.
  const { data: existing } = await supabaseAdmin
    .from('policy_reports')
    .select('id')
    .eq('work_id', workId)
    .eq('reporter_id', user.id)
    .eq('reviewed', false)
    .maybeSingle();
  if (existing) return res.status(200).json({ success: true });

  const { error } = await supabaseAdmin.from('policy_reports').insert({
    work_id: workId,
    reporter_id: user.id,
    reason,
    details: cleanDetails || null,
  });
  if (error) throw error;

  const to = teamEmail();
  if (to) {
    const baseUrl = requestBaseUrl(req.headers);
    await sendEmail({
      to,
      subject: `Nuevo reporte: ${work.title}`,
      content: {
        language: 'es',
        title: 'Nuevo reporte de una obra',
        preheader: `${REASONS[reason]}: ${work.title}`,
        blocks: [
          { type: 'details', rows: [['Obra', work.title], ['Motivo', REASONS[reason]]] },
          ...(cleanDetails ? [{ type: 'quote' as const, text: cleanDetails }] : []),
          ...(baseUrl ? [{ type: 'button' as const, label: 'REVISAR EN EL PANEL', url: `${baseUrl}/admin` }] : []),
        ],
      },
    });
  }

  return res.status(200).json({ success: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') return await createReport(req, res);

    if (!(await isAdminRequest(req.headers.authorization))) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('policy_reports')
        .select('id, reason, details, reviewed, created_at, work:works(id, title, status), reporter:profiles(username)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ reports: data || [] });
    }

    if (req.method === 'PATCH') {
      const { id, reviewed, workId, workStatus } = (req.body || {}) as {
        id?: string;
        reviewed?: boolean;
        workId?: string;
        workStatus?: string;
      };
      if (workId) {
        if (workStatus !== 'published' && workStatus !== 'removed_policy') {
          return res.status(400).json({ error: 'Datos no válidos' });
        }
        const { error } = await supabaseAdmin.from('works').update({ status: workStatus }).eq('id', workId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }
      if (!id || typeof reviewed !== 'boolean') return res.status(400).json({ error: 'Datos no válidos' });
      const { error } = await supabaseAdmin.from('policy_reports').update({ reviewed }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[REPORTS] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
