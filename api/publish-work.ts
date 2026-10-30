import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestUser } from '../server/lib/admin-auth.js';
import { alertIfBacklogReached } from '../server/lib/admin-backlog.js';
import { requestBaseUrl } from '../server/lib/email.js';
import { findBlockedTerms } from '../server/lib/moderation-text.js';

// Works are saved here so the automatic check always runs first: a work that
// passes is published right away, any other waits in the admin panel.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const PENDING_REVIEW_FLAG = 'pending_review';
const WORK_TYPES = ['pintura', 'fotografia', 'poema', 'cancion', 'video'];
const REQUIRES_FILE = ['pintura', 'fotografia', 'video'];

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanHashtags(value: unknown): string[] {
  return Array.isArray(value) ? value.map((tag) => cleanText(tag, 60)).filter(Boolean).slice(0, 30) : [];
}

// Only files the same person uploaded: the check downloads these URLs.
function ownFileUrl(value: unknown, userId: string): string | null {
  const url = String(value ?? '');
  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/works/${userId}/`;
  return url.startsWith(prefix) ? url : null;
}

async function createWork(req: VercelRequest, res: VercelResponse, userId: string) {
  const body = (req.body || {}) as Record<string, unknown>;
  const title = cleanText(body.title, 200);
  const description = cleanText(body.description, 5000);
  const workType = String(body.workType ?? '');
  const lyrics = workType === 'cancion' ? cleanText(body.lyrics, 20000) : '';
  const hashtags = cleanHashtags(body.hashtags);
  const fileUrl = body.fileUrl ? ownFileUrl(body.fileUrl, userId) : null;
  const coverUrl = body.coverUrl ? ownFileUrl(body.coverUrl, userId) : null;
  const isForSale = body.isForSale === true;
  const price = isForSale ? Number(body.price) : null;

  if (
    !title || !description || !WORK_TYPES.includes(workType) ||
    (body.fileUrl && !fileUrl) || (body.coverUrl && !coverUrl) ||
    (REQUIRES_FILE.includes(workType) && !fileUrl) ||
    (isForSale && !(Number(price) > 0))
  ) {
    return res.status(400).json({ error: 'Datos no válidos' });
  }

  // Loaded here so the model never slows down or breaks the rest of the API.
  const { moderateWork } = await import('../server/lib/moderation.js');
  const flags = await moderateWork({ workType, fileUrl, coverUrl, texts: [title, description, lyrics, hashtags.join(' ')] });
  const held = flags.length > 0;

  const { data, error } = await supabaseAdmin
    .from('works')
    .insert({
      user_id: userId,
      title,
      description,
      work_type: workType,
      file_url: fileUrl,
      cover_url: coverUrl,
      lyrics: lyrics || null,
      hashtags,
      is_for_sale: isForSale,
      price,
      language: body.language === 'en' ? 'en' : 'es',
      status: held ? 'removed_policy' : 'published',
      policy_flags: held ? [PENDING_REVIEW_FLAG, ...flags] : [],
    })
    .select('id')
    .single();
  if (error) throw error;

  if (held) await alertIfBacklogReached(requestBaseUrl(req.headers));
  return res.status(200).json({ id: data.id, held });
}

// Editing cannot be a way around the filter, so changed text is checked too.
async function editWork(req: VercelRequest, res: VercelResponse, userId: string) {
  const body = (req.body || {}) as Record<string, unknown>;
  const id = String(body.id ?? '');
  const title = cleanText(body.title, 200);
  const description = cleanText(body.description, 5000);
  const hashtags = cleanHashtags(body.hashtags);
  if (!id || !title) return res.status(400).json({ error: 'Datos no válidos' });

  const { data: work, error: readError } = await supabaseAdmin
    .from('works')
    .select('id, user_id, status')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw readError;
  if (!work || work.user_id !== userId) return res.status(404).json({ error: 'Obra no encontrada' });

  const flags = findBlockedTerms([title, description, hashtags.join(' ')].join('\n')).map((term) => `text:${term}`);
  const held = flags.length > 0;
  const { error } = await supabaseAdmin
    .from('works')
    .update({
      title,
      description,
      hashtags,
      ...(held ? { status: 'removed_policy', policy_flags: [PENDING_REVIEW_FLAG, ...flags] } : {}),
    })
    .eq('id', id);
  if (error) throw error;

  if (held) await alertIfBacklogReached(requestBaseUrl(req.headers));
  return res.status(200).json({ id, held });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getRequestUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (req.method === 'POST') return await createWork(req, res, user.id);
    if (req.method === 'PATCH') return await editWork(req, res, user.id);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[PUBLISH-WORK] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
