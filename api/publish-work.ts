import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequestUser } from '../server/lib/admin-auth.js';
import { alertIfBacklogReached } from '../server/lib/admin-backlog.js';
import { requestBaseUrl } from '../server/lib/email.js';
import { notify } from '../server/lib/notify.js';
import { findBlockedTerms } from '../server/lib/moderation-text.js';
import { withSmallCopies } from '../shared/photo-paths.js';
import { LIMITS, allow, tooMany } from '../server/lib/rate-limit.js';
import { keyOf, publicUrlOf, r2Config, removeObjects, signedUpload, browserHeaders } from '../server/lib/r2.js';
import { randomBytes } from 'node:crypto';
import {
  LIMITS as PORTFOLIO, SAME_AS_CONTENT, VISIBILITIES, cleanPortfolio, compactPortfolio, expandPortfolio, mediaToCheck, publicView, textsOf, type PortfolioContent,
} from '../shared/portfolio.js';

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
// Only what can be sold online: paintings and songs (beats), never photos, poems or videos.
const SELLABLE_TYPES = ['pintura', 'cancion'];
const MAX_EXTRA_IMAGES = 9;
const CHECK_GIVEN_UP_MS = 3 * 60 * 1000;

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanHashtags(value: unknown): string[] {
  return Array.isArray(value) ? value.map((tag) => cleanText(tag, 60)).filter(Boolean).slice(0, 30) : [];
}

const supabaseWorks = () => `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/works/`;

// Only files the same person uploaded, wherever they are kept: the check downloads these URLs.
// A "../" (plain or encoded) could climb out of the artist's folder, so it is never theirs.
function ownFileUrl(value: unknown, userId: string): string | null {
  const url = String(value ?? '');
  if (/\.\.|%2e%2e|%2f|%5c|\\/i.test(url)) return null;
  if (url.startsWith(`${supabaseWorks()}${userId}/`)) return url;
  const r2 = r2Config();
  return r2 && url.startsWith(`${r2.publicUrl}/${userId}/`) ? url : null;
}

// A file that fails to go is only wasted space, so it never fails what was asked.
async function removeOwnFiles(urls: Array<string | null>, userId: string) {
  const own = urls.filter((url): url is string => !!url && !!ownFileUrl(url, userId));
  const r2 = r2Config();
  const inR2 = own.map((url) => keyOf(r2, url)).filter((key): key is string => !!key);
  const inSupabase = own
    .filter((url) => url.startsWith(supabaseWorks()))
    .map((url) => decodeURIComponent(url.slice(supabaseWorks().length)));
  if (r2 && inR2.length) await removeObjects(r2, withSmallCopies(inR2));
  if (!inSupabase.length) return;
  const { error } = await supabaseAdmin.storage.from('works').remove(withSmallCopies(inSupabase));
  if (error) console.error('[PUBLISH-WORK] Could not remove files:', error.message);
}

// What one file may weigh: a photo and its light copy, a song, about a minute of 1080p video.
const MAX_BYTES: Record<string, number> = { image: 15 * 1024 * 1024, audio: 20 * 1024 * 1024, video: 25 * 1024 * 1024 };
// A portfolio may also hold a PDF: a dossier, a CV, a technical rider.
const PDF_TYPE = 'application/pdf';
const MAX_FILES_AT_ONCE = 24;

// The phone asks before sending: one signed permission per file, only inside the
// artist's own folder, and only for that type and size. Without R2 it is told to use
// Supabase, as before.
async function signUploads(req: VercelRequest, res: VercelResponse, userId: string) {
  const r2 = r2Config();
  if (!r2) return res.status(200).json({ storage: 'supabase' });
  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  if (!files.length || files.length > MAX_FILES_AT_ONCE) return res.status(400).json({ error: 'Datos no válidos' });
  const ownPath = new RegExp(`^${userId}/((covers|portfolio)/)?[A-Za-z0-9._-]{1,120}$`);
  const uploads = [];
  for (const file of files) {
    const path = String(file?.path ?? '');
    const type = String(file?.type ?? '').toLowerCase();
    const size = Number(file?.size);
    const isPdf = type === PDF_TYPE && path.startsWith(`${userId}/portfolio/`);
    const kind = type.split('/')[0];
    const limit = isPdf ? PORTFOLIO.bytes.pdf : (MAX_BYTES[kind] ?? 0);
    const valid = ownPath.test(path) && !path.includes('..')
      && (isPdf || (/^(image|audio|video)\/[a-z0-9.+-]+$/.test(type) && !type.includes('svg')))
      && Number.isInteger(size) && size > 0 && size <= limit;
    if (!valid) return res.status(400).json({ error: 'Datos no válidos' });
    uploads.push({ path, url: signedUpload(r2, path, type, size), headers: browserHeaders(type), publicUrl: publicUrlOf(r2, path) });
  }
  return res.status(200).json({ storage: 'r2', uploads });
}

function cleanPoemFont(value: unknown): string | null {
  return POEM_FONTS.includes(String(value)) ? String(value) : null;
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
    if (tellAuthor) await notify(supabaseAdmin, work.userId, 'work_held', { id: work.id, title: work.title });
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
  const isForSale = body.isForSale === true && SELLABLE_TYPES.includes(workType);
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
  const isForSale = body.isForSale === true && SELLABLE_TYPES.includes(work.work_type);
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
    await notify(supabaseAdmin, userId, 'work_held', { id, title });
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

// ---- Portfolios ---------------------------------------------------------------
// Saved here rather than from the page so every save is checked first: only known
// parts, the artist's own files, no blocked words. Uploaded pictures and videos are
// checked in the background and others only see them once they pass.

const newShareKey = () => randomBytes(9).toString('base64url');

interface PortfolioRow {
  visibility: string;
  share_key: string;
  content: PortfolioContent;
  checked_media: string[] | null;
  held_media: string[] | null;
  updated_at: string;
}

/**
 * What goes in the database: the portfolio without its empty parts, and what others see
 * only when it differs from it (otherwise a small mark says "the same").
 */
function stored(content: PortfolioContent, checked: string[]) {
  const compact = compactPortfolio(content);
  const shown = compactPortfolio(publicView(content, checked));
  const same = JSON.stringify(shown) === JSON.stringify(compact);
  return { content: compact, public_content: same ? SAME_AS_CONTENT : shown };
}

function ownerView(row: PortfolioRow) {
  return {
    visibility: row.visibility,
    share_key: row.share_key,
    content: expandPortfolio(row.content),
    checked_media: row.checked_media ?? [],
    held_media: row.held_media ?? [],
    updated_at: row.updated_at,
  };
}

async function checkPortfolioMedia(userId: string, media: Array<{ url: string; kind: 'image' | 'video' }>) {
  const { checkImage, checkVideo } = await import('../server/lib/moderation.js');
  const passed: string[] = [];
  const stopped: string[] = [];
  for (const { url, kind } of media) {
    try {
      const flags = kind === 'image' ? await checkImage(url) : await checkVideo(url);
      (flags.length ? stopped : passed).push(url);
      if (flags.length) console.warn('[PORTFOLIO] Held a file:', flags.join(', '));
    } catch (error: any) {
      // What cannot be checked is not shown to others, same as a work.
      console.error('[PORTFOLIO] Could not check a file:', error?.message || error);
      stopped.push(url);
    }
  }
  // Read again: the artist may have saved more while this ran. If they save in the very
  // moment this writes, it reads again, so what others see always matches the last save.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: row, error } = await supabaseAdmin
      .from('portfolios')
      .select('content, checked_media, held_media, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !row) return;
    const checked = Array.from(new Set([...(row.checked_media ?? []), ...passed]));
    const held = Array.from(new Set([...(row.held_media ?? []), ...stopped]));
    // Only what others see changes here; the portfolio itself stays as the artist last saved it.
    const { data: written, error: saveError } = await supabaseAdmin
      .from('portfolios')
      .update({ checked_media: checked, held_media: held, public_content: stored(expandPortfolio(row.content), checked).public_content })
      .eq('user_id', userId)
      .eq('updated_at', row.updated_at)
      .select('user_id');
    if (saveError) { console.error('[PORTFOLIO] Could not save the check:', saveError.message); return; }
    if (written?.length) return;
  }
}

// A portfolio shows the artist's own works only, never someone else's.
async function onlyOwnWorks(content: PortfolioContent, userId: string): Promise<PortfolioContent> {
  const wanted = new Set<string>(content.info.heroWork ? [content.info.heroWork] : []);
  content.sections.forEach((section) => section.type === 'works' && section.items.forEach((item) => wanted.add(item.id)));
  if (!wanted.size) return content;
  const { data, error } = await supabaseAdmin.from('works').select('id').eq('user_id', userId).in('id', [...wanted]);
  if (error) throw error;
  const own = new Set((data ?? []).map((row: { id: string }) => row.id));
  return {
    ...content,
    info: { ...content.info, heroWork: content.info.heroWork && own.has(content.info.heroWork) ? content.info.heroWork : null },
    sections: content.sections.map((section) => (section.type === 'works' ? { ...section, items: section.items.filter((item) => own.has(item.id)) } : section)),
  };
}

async function savePortfolio(req: VercelRequest, res: VercelResponse, userId: string) {
  const body = req.body ?? {};
  if (JSON.stringify(body).length > PORTFOLIO.saved) return res.status(413).json({ error: 'too_big' });
  const content = await onlyOwnWorks(cleanPortfolio(body.content, { ownFile: (url) => !!ownFileUrl(url, userId) }), userId);
  const blocked = findBlockedTerms(textsOf(content).join('\n'));
  if (blocked.length) return res.status(422).json({ error: 'blocked_words', words: blocked.slice(0, 3) });

  const { data: current, error: readError } = await supabaseAdmin
    .from('portfolios')
    .select('visibility, share_key, checked_media, held_media')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) throw readError;

  const visibility = VISIBILITIES.includes(body.visibility) ? body.visibility : current?.visibility ?? 'private';
  const media = mediaToCheck(content);
  const inUse = new Set(media.map((item) => item.url));
  // Only what is still in it is remembered; something removed and added back is checked again.
  const checked = (current?.checked_media ?? []).filter((url: string) => inUse.has(url));
  const held = (current?.held_media ?? []).filter((url: string) => inUse.has(url));
  const { data: saved, error } = await supabaseAdmin
    .from('portfolios')
    .upsert({
      user_id: userId,
      visibility,
      share_key: current?.share_key ?? newShareKey(),
      ...stored(content, checked),
      checked_media: checked,
      held_media: held,
      updated_at: new Date().toISOString(),
    })
    .select('visibility, share_key, content, checked_media, held_media, updated_at')
    .single();
  if (error) throw error;

  const unchecked = media.filter((item) => !checked.includes(item.url) && !held.includes(item.url));
  if (unchecked.length) waitUntil(checkPortfolioMedia(userId, unchecked).catch((err) => console.error('[PORTFOLIO] Check failed:', err)));
  return res.status(200).json(ownerView(saved as PortfolioRow));
}

// A new secret link: whoever had the old one can no longer open it.
async function renewPortfolioKey(res: VercelResponse, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('portfolios')
    .update({ share_key: newShareKey() })
    .eq('user_id', userId)
    .select('visibility, share_key, content, checked_media, held_media, updated_at')
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'not_found' });
  return res.status(200).json(ownerView(data as PortfolioRow));
}

// The portfolio goes; the files stay in the artist's folder, as the rest of their things.
async function deletePortfolio(res: VercelResponse, userId: string) {
  const { error } = await supabaseAdmin.from('portfolios').delete().eq('user_id', userId);
  if (error) throw error;
  return res.status(200).json({ deleted: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getRequestUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'No autorizado' });
    if (req.query.action === 'portfolio' || req.query.action === 'portfolio-key') {
      if (!(await allow(LIMITS.portfolio, user.id))) return tooMany(res, LIMITS.portfolio);
      if (req.query.action === 'portfolio-key' && req.method === 'POST') return await renewPortfolioKey(res, user.id);
      if (req.query.action === 'portfolio' && req.method === 'PUT') return await savePortfolio(req, res, user.id);
      if (req.query.action === 'portfolio' && req.method === 'DELETE') return await deletePortfolio(res, user.id);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (req.method === 'POST' && req.query.action === 'upload') {
      if (!(await allow(LIMITS.signUploads, user.id))) return tooMany(res, LIMITS.signUploads);
      return await signUploads(req, res, user.id);
    }
    if (req.method === 'POST') {
      if (!(await allow(LIMITS.publishWork, user.id))) return tooMany(res, LIMITS.publishWork);
      return await createWork(req, res, user.id);
    }
    if (req.method === 'PATCH') {
      if (!(await allow(LIMITS.editWork, user.id))) return tooMany(res, LIMITS.editWork);
      return await editWork(req, res, user.id);
    }
    if (req.method === 'DELETE') return await deleteWork(req, res, user.id);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[PUBLISH-WORK] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
