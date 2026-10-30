import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestUser, roleOf, signedInRecently, type AdminRole } from '../server/lib/admin-auth.js';
import { alertIfBacklogReached } from '../server/lib/admin-backlog.js';
import { HELP_ADDRESS, requestBaseUrl, sendEmail } from '../server/lib/email.js';

// policy_reports only lets reporters read their own rows, so moderators and the
// team notification go through this endpoint.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const PENDING_REVIEW_FLAG = 'pending_review';
const CHECKING_FLAG = 'checking';
// A check that has not finished by then was cut short, and a person has to look.
const CHECK_GIVEN_UP_MS = 3 * 60 * 1000;
const REVIEWED_KEPT_MS = 48 * 60 * 60 * 1000;

const REASONS: Record<string, string> = {
  porno: 'Contenido +18',
  gore: 'Violencia gráfica',
  spam: 'Spam',
  acoso: 'Acoso o abuso',
  otro: 'Otro',
};

const MAX_REASONS = 2;

async function createReport(req: VercelRequest, res: VercelResponse) {
  const user = await getRequestUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { workId, reasons, details } = (req.body || {}) as { workId?: string; reasons?: unknown; details?: string };
  const chosen = Array.isArray(reasons) ? [...new Set(reasons.map(String))] : [];
  const cleanDetails = String(details ?? '').trim().slice(0, 1000);
  if (
    !workId || chosen.length === 0 || chosen.length > MAX_REASONS ||
    chosen.some((reason) => !Object.keys(REASONS).includes(reason)) ||
    (chosen.includes('otro') && !cleanDetails)
  ) {
    return res.status(400).json({ error: 'Datos no válidos' });
  }

  const { data: work } = await supabaseAdmin.from('works').select('id').eq('id', workId).maybeSingle();
  if (!work) return res.status(404).json({ error: 'Obra no encontrada' });

  // One report per person and work, so insisting never counts twice towards the automatic removal.
  const { data: existing } = await supabaseAdmin
    .from('policy_reports')
    .select('id')
    .eq('work_id', workId)
    .eq('reporter_id', user.id)
    .maybeSingle();
  if (existing) return res.status(200).json({ success: true });

  // The reason column holds one value: a second one travels at the start of details.
  const [reason, secondReason] = chosen;
  const storedDetails = [secondReason ? `[${secondReason}]` : '', cleanDetails].filter(Boolean).join(' ');
  const { error } = await supabaseAdmin.from('policy_reports').insert({
    work_id: workId,
    reporter_id: user.id,
    reason,
    details: storedDetails || null,
  });
  if (error) throw error;

  await alertIfBacklogReached(requestBaseUrl(req.headers));
  return res.status(200).json({ success: true });
}

// There is no schedule to run this on: opening the panel is the only moment they could be seen.
async function deleteOldReviewedReports() {
  const { error } = await supabaseAdmin
    .from('policy_reports')
    .delete()
    .eq('reviewed', true)
    .lt('reviewed_at', new Date(Date.now() - REVIEWED_KEPT_MS).toISOString());
  if (error) console.warn('[REPORTS] Could not delete old reports:', error.message);
}

const REPORTS_QUERY = 'id, reason, details, reviewed, created_at, work:works(id, title, status), reporter:profiles(username)';

// Everything the admin panel shows, in one request: one cold start and one
// session check instead of three, and the tabs then open instantly.
async function loadPanel(res: VercelResponse, role: AdminRole) {
  await deleteOldReviewedReports();
  const [messages, reports, held] = await Promise.all([
    supabaseAdmin.from('help_messages').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('policy_reports').select(REPORTS_QUERY).order('created_at', { ascending: false }),
    supabaseAdmin
      .from('works')
      .select('id, title, description, lyrics, hashtags, work_type, file_url, cover_url, extra_images, policy_flags, created_at, updated_at, user:profiles!works_user_id_fkey(username)')
      .eq('status', 'removed_policy')
      .contains('policy_flags', [PENDING_REVIEW_FLAG])
      .order('created_at', { ascending: false }),
  ]);
  const failed = messages.error || reports.error || held.error;
  if (failed) throw failed;
  const decided = (held.data ?? []).filter((work) => (
    !work.policy_flags?.includes(CHECKING_FLAG) || Date.now() - Date.parse(work.updated_at ?? work.created_at) > CHECK_GIVEN_UP_MS
  ));
  return res.status(200).json({ role, messages: messages.data, reports: reports.data, held: decided });
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
    .select('id, user_id, title, file_url, cover_url, extra_images, policy_flags')
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
    const paths = [work.file_url, work.cover_url, ...(work.extra_images ?? [])].map(storagePath).filter((path): path is string => !!path);
    if (paths.length) {
      const { error: storageError } = await supabaseAdmin.storage.from('works').remove(paths);
      if (storageError) console.warn('[REPORTS] Could not remove held files:', storageError.message);
    }
  }
  await notifyArtist(work.user_id, work.title, decision === 'approve', requestBaseUrl(req.headers), work.id);
  return res.status(200).json({ success: true });
}

async function listAdmins(res: VercelResponse) {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  const admins = users.filter((user) => roleOf(user));
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username')
    .in('id', admins.map((user) => user.id));
  if (error) throw error;
  const usernames = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  return res.status(200).json({
    admins: admins
      .map((user) => ({ id: user.id, username: usernames.get(user.id) ?? null, role: roleOf(user) }))
      .sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1)),
  });
}

// Owner only, and only after a recent sign-in. The flag lives in app_metadata,
// which users cannot edit themselves.
async function changeAdmin(req: VercelRequest, res: VercelResponse, actorId: string) {
  const { adminAction, username } = (req.body || {}) as { adminAction?: string; username?: string };
  const clean = String(username ?? '').trim().replace(/^@/, '');
  if ((adminAction !== 'grant' && adminAction !== 'revoke') || !/^[a-zA-Z0-9_.-]{1,40}$/.test(clean)) {
    return res.status(400).json({ code: 'invalid_username' });
  }

  const pattern = clean.replace(/[\\%_]/g, '\\$&');
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, is_banned')
    .ilike('username', pattern)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return res.status(404).json({ code: 'user_not_found' });

  const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (targetError || !target?.user) return res.status(404).json({ code: 'user_not_found' });
  if (roleOf(target.user) === 'owner') return res.status(400).json({ code: 'is_owner' });

  const granting = adminAction === 'grant';
  if (granting && !target.user.email_confirmed_at) return res.status(400).json({ code: 'email_not_confirmed' });
  if (granting && profile.is_banned) return res.status(400).json({ code: 'banned_user' });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    app_metadata: { ...target.user.app_metadata, makwin_admin: granting },
  });
  if (error) throw error;
  console.info(`[ADMIN-ACCESS] ${actorId} ${adminAction} ${profile.id}`);

  const email = target.user.email;
  if (email) {
    const language = target.user.user_metadata?.language_preference === 'en' ? 'en' : 'es';
    const es = language === 'es';
    const baseUrl = requestBaseUrl(req.headers);
    await sendEmail({
      to: email,
      subject: granting
        ? (es ? 'Ya eres administrador de MAKWIN' : 'You are now a MAKWIN admin')
        : (es ? 'Ya no eres administrador de MAKWIN' : 'You are no longer a MAKWIN admin'),
      content: {
        language,
        title: granting ? (es ? 'Ya eres administrador' : 'You are now an admin') : (es ? 'Ya no eres administrador' : 'You are no longer an admin'),
        preheader: es ? 'Cambio en los permisos de tu cuenta de MAKWIN.' : 'A change to your MAKWIN account permissions.',
        blocks: [
          {
            type: 'text',
            text: granting
              ? (es ? 'Te han dado permisos de administrador en MAKWIN. Encontrarás el panel en el menú de tu perfil.' : 'You have been given admin access on MAKWIN. You will find the panel in your profile menu.')
              : (es ? 'Tus permisos de administrador en MAKWIN se han retirado.' : 'Your admin access on MAKWIN has been removed.'),
          },
          ...(granting && baseUrl ? [{ type: 'button' as const, label: es ? 'ABRIR EL PANEL' : 'OPEN THE PANEL', url: `${baseUrl}/admin` }] : []),
          ...(granting
            ? [{ type: 'note' as const, text: es ? 'Protege tu cuenta: activa la verificación en dos pasos en tu correo.' : 'Protect your account: turn on two-step verification on your email.' }]
            : []),
        ],
      },
    });
  }
  return res.status(200).json({ success: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'POST') return await createReport(req, res);

    const user = await getRequestUser(req.headers.authorization);
    const role = roleOf(user);

    // Lets the menu know whether to show the panel; the role alone reveals nothing.
    if (req.method === 'GET' && req.query?.scope === 'access') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ role });
    }

    if (!user || !role) return res.status(401).json({ error: 'No autorizado' });
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET' && req.query?.scope === 'panel') return await loadPanel(res, role);

    if (req.method === 'GET' && req.query?.scope === 'admins') {
      if (role !== 'owner') return res.status(403).json({ error: 'No autorizado' });
      return await listAdmins(res);
    }

    if (req.method === 'PATCH' && req.body?.adminAction) {
      if (role !== 'owner') return res.status(403).json({ error: 'No autorizado' });
      if (!signedInRecently(user)) return res.status(403).json({ code: 'recent_login_required' });
      return await changeAdmin(req, res, user.id);
    }

    if (req.method === 'PATCH' && req.body?.heldWorkId) return await decideHeldWork(req, res);

    if (req.method === 'GET') {
      await deleteOldReviewedReports();
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
      const { error } = await supabaseAdmin.from('policy_reports').update({ reviewed, reviewed_at: reviewed ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[REPORTS] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
