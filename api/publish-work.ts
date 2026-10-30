import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestUser } from '../server/lib/admin-auth.js';
import { alertIfBacklogReached } from '../server/lib/admin-backlog.js';
import { HELP_ADDRESS, requestBaseUrl, sendEmail } from '../server/lib/email.js';
import { findBlockedTerms } from '../server/lib/moderation-text.js';

// Works are saved here and the artist moves on straight away. The automatic check
// runs in the background: the work becomes public when it passes, and otherwise
// waits in the admin panel and its author gets an email. If the check never
// finishes, it stays private and reaches the panel anyway.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
);

const PENDING_REVIEW_FLAG = 'pending_review';
const CHECKING_FLAG = 'checking';
const POEM_FONTS = ['clasica', 'elegante', 'moderna', 'maquina', 'manuscrita'];
const WORK_TYPES = ['pintura', 'fotografia', 'poema', 'cancion', 'video'];
const REQUIRES_FILE = ['pintura', 'fotografia', 'video'];
const PHOTO_TYPES = ['pintura', 'fotografia'];
const MAX_EXTRA_IMAGES = 9;

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

function cleanPoemFont(value: unknown): string | null {
  return POEM_FONTS.includes(String(value)) ? String(value) : null;
}

// Only ever for a work that did not pass. A work that passes sends no email at all.
async function notifyWorkHeld(userId: string, title: string) {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (!email) return;
  const language = data.user?.user_metadata?.language_preference === 'en' ? 'en' : 'es';
  const es = language === 'es';
  await sendEmail({
    to: email,
    subject: es ? `Tu obra «${title}» no se ha publicado todavía` : `Your work "${title}" has not been published yet`,
    content: {
      language,
      title: es ? 'Tu obra no ha pasado los filtros' : 'Your work did not pass our filters',
      preheader: title,
      blocks: [
        { type: 'text', text: es ? `«${title}» no ha pasado los filtros automáticos de MAKWIN, así que todavía no se ha publicado. Una persona del equipo la va a revisar y te escribiremos con la decisión.` : `"${title}" did not pass MAKWIN's automatic filters, so it has not been published yet. Someone from the team will review it and we will write to you with the decision.` },
        { type: 'note', text: es ? `No tienes que hacer nada. Si tienes alguna duda, escríbenos a ${HELP_ADDRESS}.` : `There is nothing you need to do. If you have any questions, write to us at ${HELP_ADDRESS}.` },
      ],
    },
  });
}

interface WorkInCheck {
  id: string;
  userId: string;
  title: string;
  workType: string;
  fileUrl: string | null;
  coverUrl: string | null;
  extraImages: string[];
  texts: string[];
}

async function finishCheck(work: WorkInCheck, baseUrl: string) {
  // Loaded only for images and video: while the model starts up, this instance answers
  // nobody else, and a work that is only text has no need of it.
  const hasMedia = !!work.coverUrl || work.extraImages.length > 0 || (!!work.fileUrl && REQUIRES_FILE.includes(work.workType));
  let flags: string[];
  if (hasMedia) {
    const { moderateWork } = await import('../server/lib/moderation.js');
    flags = await moderateWork(work);
  } else {
    flags = findBlockedTerms(work.texts.filter(Boolean).join('\n')).map((term) => `text:${term}`);
  }
  const held = flags.length > 0;

  // Only while it is still waiting for this check: its author may have deleted it meanwhile.
  const { data, error } = await supabaseAdmin
    .from('works')
    .update(held ? { policy_flags: [PENDING_REVIEW_FLAG, ...flags] } : { status: 'published', policy_flags: [] })
    .eq('id', work.id)
    .contains('policy_flags', [CHECKING_FLAG])
    .select('id');
  if (error) throw error;

  if (held && data?.length) {
    await alertIfBacklogReached(baseUrl);
    await notifyWorkHeld(work.userId, work.title);
  }
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
  const rawExtraImages = Array.isArray(body.extraImages) ? body.extraImages : [];
  const extraImages = rawExtraImages.map((url) => ownFileUrl(url, userId)).filter((url): url is string => !!url);
  const poemFont = workType === 'poema' ? cleanPoemFont(body.poemFont) : null;
  const isForSale = body.isForSale === true;
  const price = isForSale ? Number(body.price) : null;

  if (
    !title || !description || !WORK_TYPES.includes(workType) ||
    (body.fileUrl && !fileUrl) || (body.coverUrl && !coverUrl) ||
    (REQUIRES_FILE.includes(workType) && !fileUrl) ||
    extraImages.length !== rawExtraImages.length || extraImages.length > MAX_EXTRA_IMAGES ||
    (extraImages.length > 0 && !PHOTO_TYPES.includes(workType)) ||
    (isForSale && !(Number(price) > 0))
  ) {
    return res.status(400).json({ error: 'Datos no válidos' });
  }

  const { data, error } = await supabaseAdmin
    .from('works')
    .insert({
      user_id: userId,
      title,
      description,
      work_type: workType,
      file_url: fileUrl,
      cover_url: coverUrl,
      extra_images: extraImages,
      poem_font: poemFont,
      lyrics: lyrics || null,
      hashtags,
      is_for_sale: isForSale,
      price,
      language: body.language === 'en' ? 'en' : 'es',
      status: 'removed_policy',
      policy_flags: [PENDING_REVIEW_FLAG, CHECKING_FLAG],
    })
    .select('id')
    .single();
  if (error) throw error;

  waitUntil(
    finishCheck(
      { id: data.id, userId, title, workType, fileUrl, coverUrl, extraImages, texts: [title, description, lyrics, hashtags.join(' ')] },
      requestBaseUrl(req.headers),
    ).catch((checkError) => console.error('[PUBLISH-WORK] Check did not finish:', checkError)),
  );
  return res.status(200).json({ id: data.id });
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
      ...(body.poemFont ? { poem_font: cleanPoemFont(body.poemFont) } : {}),
      ...(held ? { status: 'removed_policy', policy_flags: [PENDING_REVIEW_FLAG, ...flags] } : {}),
    })
    .eq('id', id);
  if (error) throw error;

  if (held) {
    await alertIfBacklogReached(requestBaseUrl(req.headers));
    await notifyWorkHeld(userId, title);
  }
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
