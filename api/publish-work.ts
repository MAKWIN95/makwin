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
const CHECK_GIVEN_UP_MS = 3 * 60 * 1000;

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

// A file that fails to go is only wasted space, so it never fails what was asked.
async function removeOwnFiles(urls: Array<string | null>, userId: string) {
  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/works/`;
  const paths = urls
    .filter((url): url is string => !!url && !!ownFileUrl(url, userId))
    .map((url) => decodeURIComponent(url.slice(prefix.length)));
  if (!paths.length) return;
  const { error } = await supabaseAdmin.storage.from('works').remove(paths);
  if (error) console.error('[PUBLISH-WORK] Could not remove files:', error.message);
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

async function finishCheck(work: WorkInCheck, baseUrl: string, tellAuthor = true) {
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
    if (tellAuthor) await notifyWorkHeld(work.userId, work.title);
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

// Editing cannot be a way around the filter. Changed text is checked here and now.
// New photos go through the same background check as a new work, and a work waiting
// for review is checked again whole: one that still fails simply stays held.
async function editWork(req: VercelRequest, res: VercelResponse, userId: string) {
  const body = (req.body || {}) as Record<string, unknown>;
  const id = String(body.id ?? '');
  const title = cleanText(body.title, 200);
  const description = cleanText(body.description, 5000);
  const hashtags = cleanHashtags(body.hashtags);
  if (!id || !title) return res.status(400).json({ error: 'Datos no válidos' });

  const { data: work, error: readError } = await supabaseAdmin
    .from('works')
    .select('id, user_id, status, work_type, file_url, cover_url, extra_images, lyrics, policy_flags, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw readError;
  if (!work || work.user_id !== userId || work.status === 'removed_user') return res.status(404).json({ error: 'Obra no encontrada' });

  const currentFlags: string[] = work.policy_flags ?? [];
  const wasHeld = work.status === 'removed_policy' && currentFlags.includes(PENDING_REVIEW_FLAG);
  // Taken down by the team: changing it must not be a way back.
  if (work.status === 'removed_policy' && !wasHeld) return res.status(403).json({ error: 'removed' });
  // One check at a time, or an older result could publish newer photos.
  if (currentFlags.includes(CHECKING_FLAG) && Date.now() - Date.parse(work.updated_at) < CHECK_GIVEN_UP_MS) {
    return res.status(409).json({ error: 'checking' });
  }

  if (work.work_type === 'poema' && !work.file_url && !description) return res.status(400).json({ error: 'Datos no válidos' });

  const oldImages: string[] = PHOTO_TYPES.includes(work.work_type)
    ? [work.file_url, ...(work.extra_images ?? [])].filter(Boolean)
    : [];
  let images = oldImages;
  if (Array.isArray(body.images)) {
    images = body.images.map(String);
    const valid = PHOTO_TYPES.includes(work.work_type)
      && images.length > 0 && images.length <= MAX_EXTRA_IMAGES + 1
      && new Set(images).size === images.length
      && images.every((url) => oldImages.includes(url) || ownFileUrl(url, userId));
    if (!valid) return res.status(400).json({ error: 'Datos no válidos' });
  }
  const added = images.filter((url) => !oldImages.includes(url));
  const removed = oldImages.filter((url) => !images.includes(url));

  const lyrics = work.work_type === 'cancion' && body.lyrics !== undefined ? cleanText(body.lyrics, 20000) : work.lyrics;
  const isForSale = body.isForSale === true;
  const price = isForSale ? Number(body.price) : null;
  if (body.isForSale !== undefined && isForSale && !(Number(price) > 0)) return res.status(400).json({ error: 'Datos no válidos' });

  const texts = [title, description, lyrics ?? '', hashtags.join(' ')];
  const textFlags = findBlockedTerms(texts.filter(Boolean).join('\n')).map((term) => `text:${term}`);
  const held = textFlags.length > 0;
  const checking = !held && (added.length > 0 || wasHeld);

  const { data: saved, error } = await supabaseAdmin
    .from('works')
    .update({
      title,
      description,
      hashtags,
      lyrics,
      updated_at: new Date().toISOString(),
      ...(images !== oldImages ? { file_url: images[0], extra_images: images.slice(1) } : {}),
      ...(body.isForSale !== undefined ? { is_for_sale: isForSale, price } : {}),
      ...(body.poemFont ? { poem_font: cleanPoemFont(body.poemFont) } : {}),
      ...(held ? { status: 'removed_policy', policy_flags: [PENDING_REVIEW_FLAG, ...textFlags] } : {}),
      ...(checking ? { status: 'removed_policy', policy_flags: [PENDING_REVIEW_FLAG, CHECKING_FLAG] } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  await removeOwnFiles(removed, userId);

  const baseUrl = requestBaseUrl(req.headers);
  if (held && !wasHeld) {
    await alertIfBacklogReached(baseUrl);
    await notifyWorkHeld(userId, title);
  }
  if (checking) {
    waitUntil(
      finishCheck(
        {
          id,
          userId,
          title,
          workType: work.work_type,
          // Photos already through the check are not asked about again, unless the work is on hold.
          fileUrl: wasHeld ? saved.file_url : null,
          coverUrl: wasHeld ? saved.cover_url : null,
          extraImages: wasHeld ? saved.extra_images ?? [] : added,
          texts,
        },
        baseUrl,
        !wasHeld,
      ).catch((checkError) => console.error('[PUBLISH-WORK] Check did not finish:', checkError)),
    );
  }
  return res.status(200).json({ work: saved, held, checking });
}

// Through here rather than directly so the files go too, not only the row.
async function deleteWork(req: VercelRequest, res: VercelResponse, userId: string) {
  const id = String(req.query.id ?? '');
  const { data: work, error: readError } = await supabaseAdmin
    .from('works')
    .select('id, user_id, file_url, cover_url, extra_images')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw readError;
  if (!work || work.user_id !== userId) return res.status(404).json({ error: 'Obra no encontrada' });

  const { error } = await supabaseAdmin.from('works').delete().eq('id', id);
  if (error) throw error;
  await removeOwnFiles([work.file_url, work.cover_url, ...(work.extra_images ?? [])], userId);
  return res.status(200).json({ id });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getRequestUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (req.method === 'POST') return await createWork(req, res, user.id);
    if (req.method === 'PATCH') return await editWork(req, res, user.id);
    if (req.method === 'DELETE') return await deleteWork(req, res, user.id);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[PUBLISH-WORK] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
