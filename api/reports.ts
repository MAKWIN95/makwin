import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestUser, isAdminRequest } from '../server/lib/admin-auth.js';
import { HELP_ADDRESS, requestBaseUrl, sendEmail, teamEmail } from '../server/lib/email.js';

// policy_reports only lets reporters read their own rows, so moderators and the
// team notification go through this endpoint.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const PENDING_REVIEW_FLAG = 'pending_review';

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

const REPORTS_QUERY = 'id, reason, details, reviewed, created_at, work:works(id, title, status), reporter:profiles(username)';

// Everything the admin panel shows, in one request: one cold start and one
// session check instead of three, and the tabs then open instantly.
async function loadPanel(res: VercelResponse) {
  const [messages, reports, held] = await Promise.all([
    supabaseAdmin.from('help_messages').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('policy_reports').select(REPORTS_QUERY).order('created_at', { ascending: false }),
    supabaseAdmin
      .from('works')
      .select('id, title, description, lyrics, hashtags, work_type, file_url, cover_url, policy_flags, created_at, user:profiles!works_user_id_fkey(username)')
      .eq('status', 'removed_policy')
      .contains('policy_flags', [PENDING_REVIEW_FLAG])
      .order('created_at', { ascending: false }),
  ]);
  const failed = messages.error || reports.error || held.error;
  if (failed) throw failed;
  return res.status(200).json({ messages: messages.data, reports: reports.data, held: held.data });
}

function storagePath(url: string | null): string | null {
  const marker = '/object/public/works/';
  const at = url?.indexOf(marker) ?? -1;
  return url && at >= 0 ? decodeURIComponent(url.slice(at + marker.length)) : null;
}

async function notifyArtist(userId: string, title: string, approved: boolean, baseUrl: string, workId: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (!email) return;
  const language = data.user?.user_metadata?.language_preference === 'en' ? 'en' : 'es';
  const es = language === 'es';
  await sendEmail({
    to: email,
    subject: approved
      ? (es ? `Tu obra «${title}» ya está publicada` : `Your work "${title}" is now published`)
      : (es ? `Tu obra «${title}» no se ha publicado` : `Your work "${title}" was not published`),
    content: {
      language,
      title: approved ? (es ? 'Tu obra ya está publicada' : 'Your work is now published') : (es ? 'Tu obra no se ha publicado' : 'Your work was not published'),
      preheader: title,
      blocks: approved
        ? [
            { type: 'text', text: es ? `Hemos revisado «${title}» y ya puede verla todo el mundo en MAKWIN.` : `We have reviewed "${title}" and everyone can now see it on MAKWIN.` },
            ...(baseUrl ? [{ type: 'button' as const, label: es ? 'VER MI OBRA' : 'SEE MY WORK', url: `${baseUrl}/work/${workId}` }] : []),
          ]
        : [
            { type: 'text', text: es ? `Hemos revisado «${title}» y no cumple las normas de MAKWIN, así que la hemos eliminado.` : `We have reviewed "${title}". It does not meet MAKWIN's rules, so it has been removed.` },
            { type: 'note', text: es ? `Si crees que es un error, escríbenos a ${HELP_ADDRESS}.` : `If you think this is a mistake, write to us at ${HELP_ADDRESS}.` },
          ],
    },
  });
}

async function decideHeldWork(req: VercelRequest, res: VercelResponse) {
  const { heldWorkId: id, decision } = (req.body || {}) as { heldWorkId?: string; decision?: string };
  if (!id || (decision !== 'approve' && decision !== 'delete')) return res.status(400).json({ error: 'Datos no válidos' });

  const { data: work, error } = await supabaseAdmin
    .from('works')
    .select('id, user_id, title, file_url, cover_url, policy_flags')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!work || !work.policy_flags?.includes(PENDING_REVIEW_FLAG)) return res.status(404).json({ error: 'Obra no encontrada' });

  if (decision === 'approve') {
    const { error: updateError } = await supabaseAdmin.from('works').update({ status: 'published', policy_flags: [] }).eq('id', id);
    if (updateError) throw updateError;
  } else {
    const { error: deleteError } = await supabaseAdmin.from('works').delete().eq('id', id);
    if (deleteError) throw deleteError;
    const paths = [work.file_url, work.cover_url].map(storagePath).filter((path): path is string => !!path);
    if (paths.length) {
      const { error: storageError } = await supabaseAdmin.storage.from('works').remove(paths);
      if (storageError) console.warn('[REPORTS] Could not remove held files:', storageError.message);
    }
  }
  await notifyArtist(work.user_id, work.title, decision === 'approve', requestBaseUrl(req.headers), work.id);
  return res.status(200).json({ success: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') return await createReport(req, res);

    if (!(await isAdminRequest(req.headers.authorization))) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    if (req.method === 'GET' && req.query?.scope === 'panel') return await loadPanel(res);
    if (req.method === 'PATCH' && req.body?.heldWorkId) return await decideHeldWork(req, res);

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('policy_reports')
        .select(REPORTS_QUERY)
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
