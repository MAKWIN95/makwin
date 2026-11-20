import { supabase, type Profile, type Work } from './supabase';
import { prepareImage } from './compress-image';
import { uploadWorkFile } from './work-storage';
import {
  DEFAULT_DESIGN,
  LIMITS,
  emptyInfo,
  fileKindOf,
  type Discipline,
  type FileKind,
  type PortfolioAccent,
  type PortfolioContent,
  type PortfolioRecord,
  type PortfolioVisibility,
  type Section,
  type SectionType,
} from '@shared/portfolio';

export * from '@shared/portfolio';

type Lang = 'es' | 'en';
const t = (lang: Lang, es: string, en: string) => (lang === 'es' ? es : en);

// ---- Reading and saving ----------------------------------------------------------

/** The portfolio of this artist, if the person looking may see it (null if not). */
export async function loadPortfolio(username: string, key?: string | null): Promise<PortfolioRecord | null> {
  const { data, error } = await supabase.rpc('get_portfolio', { p_username: username.toLowerCase(), p_key: key || null });
  if (error) throw new Error(error.message);
  return (data as PortfolioRecord | null) ?? null;
}

export interface SavedPortfolio {
  visibility: PortfolioVisibility;
  share_key: string;
  content: PortfolioContent;
  checked_media: string[];
  held_media: string[];
  updated_at: string;
}

export class PortfolioError extends Error {
  constructor(public code: string, public words: string[] = []) {
    super(code);
  }
}

async function call(method: 'PUT' | 'POST' | 'DELETE', action: string, body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`/api/publish-work?action=${action}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const reply = await response.json().catch(() => ({}));
  if (!response.ok) throw new PortfolioError(reply?.error || `http_${response.status}`, reply?.words ?? []);
  return reply;
}

export const savePortfolio = (content: PortfolioContent, visibility: PortfolioVisibility): Promise<SavedPortfolio> =>
  call('PUT', 'portfolio', { content, visibility });

export const renewShareKey = (): Promise<SavedPortfolio> => call('POST', 'portfolio-key');

export const deletePortfolio = (): Promise<void> => call('DELETE', 'portfolio');

/** The address to send: the same for everyone when public, with its secret when only by link. */
export function portfolioLink(username: string, visibility: PortfolioVisibility, key: string | null): string {
  const base = `${window.location.origin}/p/${username}`;
  return visibility === 'link' && key ? `${base}?k=${key}` : base;
}

// ---- Works shown in it -------------------------------------------------------------

export type PortfolioWork = Pick<Work, 'id' | 'user_id' | 'title' | 'work_type' | 'file_url' | 'cover_url' | 'description' | 'status' | 'created_at'> & { poem_font?: string | null };
const WORK_FIELDS = 'id, user_id, title, work_type, file_url, cover_url, description, status, created_at, poem_font';

export async function loadWorks(ids: string[]): Promise<Map<string, PortfolioWork>> {
  const found = new Map<string, PortfolioWork>();
  if (!ids.length) return found;
  const { data } = await supabase.from('works').select(WORK_FIELDS).in('id', ids).eq('status', 'published');
  (data ?? []).forEach((work) => found.set(work.id, work as PortfolioWork));
  return found;
}

/** All the artist's published works, newest first: what they can choose from. */
export async function loadOwnWorks(userId: string): Promise<PortfolioWork[]> {
  const { data } = await supabase
    .from('works')
    .select(WORK_FIELDS)
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  return (data ?? []) as PortfolioWork[];
}

export const isPictureWork = (work: PortfolioWork) => work.work_type === 'pintura' || work.work_type === 'fotografia';

/** The picture that stands for a work, if it has one. */
export function workPicture(work: PortfolioWork): string | null {
  return work.cover_url || (isPictureWork(work) ? work.file_url : null);
}

// ---- Uploading -----------------------------------------------------------------------

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav',
  'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/x-flac': 'flac', 'audio/webm': 'webm',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'application/pdf': 'pdf',
};

export type UploadProblem = 'type' | 'size';

/** Whether this file can go in a portfolio, and if not, why. */
export function fileProblem(file: File): UploadProblem | null {
  const kind = fileKindOf(file.type) ?? (/\.hei[cf]$/i.test(file.name) ? 'image' : null);
  if (!kind) return 'type';
  // Photos are made lighter before going up, so only their original size is no limit.
  if (kind !== 'image' && file.size > LIMITS.bytes[kind]) return 'size';
  return null;
}

/** A readable name from the file's own: "Mi tema final v2". */
export function nameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LIMITS.short);
}

/** Sends a file of the portfolio to the artist's own folder and says where it can be seen. */
export async function uploadPortfolioFile(file: File, userId: string): Promise<{ url: string; kind: FileKind }> {
  const ready = fileKindOf(file.type) === 'image' || /\.hei[cf]$/i.test(file.name) ? await prepareImage(file) : file;
  const kind = fileKindOf(ready.type);
  if (!kind) throw new Error('type');
  if (ready.size > LIMITS.bytes[kind]) throw new Error('size');
  const ext = EXTENSIONS[ready.type.toLowerCase()] ?? (ready.name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || 'bin');
  const stem = nameFromFile(ready).normalize('NFD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'archivo';
  const path = `${userId}/portfolio/${Date.now().toString(36)}-${stem}.${ext}`;
  const url = await uploadWorkFile(ready, path);
  return { url, kind };
}

// ---- Links -----------------------------------------------------------------------------

const SERVICES: Array<[RegExp, string]> = [
  [/(^|\.)spotify\.com$/, 'Spotify'],
  [/(^|\.)music\.apple\.com$/, 'Apple Music'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)soundcloud\.com$/, 'SoundCloud'],
  [/(^|\.)bandcamp\.com$/, 'Bandcamp'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)behance\.net$/, 'Behance'],
  [/(^|\.)artstation\.com$/, 'ArtStation'],
  [/(^|\.)vimeo\.com$/, 'Vimeo'],
  [/(^|\.)(x|twitter)\.com$/, 'X'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)makwin\.art$/, 'MAKWIN'],
];

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** "Spotify", "YouTube"… or the site's own address. */
export function serviceOf(url: string): string {
  const host = hostOf(url);
  return SERVICES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
}

/** Spotify and YouTube can be played right there, without leaving the portfolio. */
export function embedOf(url: string): { src: string; tall: boolean } | null {
  try {
    const link = new URL(url);
    const host = link.hostname.replace(/^www\./, '');
    if (host === 'open.spotify.com') {
      const match = link.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/);
      if (match) return { src: `https://open.spotify.com/embed/${match[1]}/${match[2]}`, tall: match[1] !== 'track' && match[1] !== 'episode' };
    }
    let id: string | null = null;
    if (host === 'youtu.be') id = link.pathname.slice(1);
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      id = link.searchParams.get('v') ?? link.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{6,})/)?.[1] ?? null;
    }
    if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) return { src: `https://www.youtube.com/embed/${id}`, tall: false };
  } catch {
    return null;
  }
  return null;
}

// ---- Starting: a portfolio already made from what the artist has -----------------

export const DISCIPLINE_INFO: Record<Discipline, { es: string; en: string; headlineEs: string; headlineEn: string; workTypes: string[] }> = {
  musica: { es: 'Música y producción', en: 'Music & production', headlineEs: 'Músico y productor', headlineEn: 'Musician & producer', workTypes: ['cancion'] },
  visual: { es: 'Pintura e ilustración', en: 'Painting & illustration', headlineEs: 'Artista visual', headlineEn: 'Visual artist', workTypes: ['pintura'] },
  fotografia: { es: 'Fotografía', en: 'Photography', headlineEs: 'Fotógrafo', headlineEn: 'Photographer', workTypes: ['fotografia'] },
  escritura: { es: 'Escritura y poesía', en: 'Writing & poetry', headlineEs: 'Escritor y poeta', headlineEn: 'Writer & poet', workTypes: ['poema'] },
  audiovisual: { es: 'Vídeo y cine', en: 'Video & film', headlineEs: 'Realizador audiovisual', headlineEn: 'Filmmaker', workTypes: ['video'] },
  otro: { es: 'Otra disciplina', en: 'Another discipline', headlineEs: 'Artista', headlineEn: 'Artist', workTypes: [] },
};

/** What a new section of each kind is called, and what it is for (shown when adding one). */
export const SECTION_INFO: Record<SectionType, { es: string; en: string; aboutEs: string; aboutEn: string }> = {
  about: { es: 'Sobre mí', en: 'About me', aboutEs: 'Quién eres y qué buscas con tu obra.', aboutEn: 'Who you are and what your work is about.' },
  works: { es: 'Obras', en: 'Works', aboutEs: 'Elige obras que ya tienes en MAKWIN.', aboutEn: 'Choose works you already have on MAKWIN.' },
  entries: { es: 'Trayectoria', en: 'Track record', aboutEs: 'Exposiciones, créditos, premios, formación…', aboutEn: 'Exhibitions, credits, awards, education…' },
  files: { es: 'Archivos', en: 'Files', aboutEs: 'Temas, vídeos, fotos o un PDF, como tu dossier.', aboutEn: 'Tracks, videos, photos or a PDF, like your press kit.' },
  links: { es: 'Enlaces', en: 'Links', aboutEs: 'Spotify, YouTube, tu web… Se escuchan aquí mismo.', aboutEn: 'Spotify, YouTube, your website… They play right here.' },
  quotes: { es: 'Prensa', en: 'Press', aboutEs: 'Lo que han dicho de ti, con quién lo dijo.', aboutEn: 'What has been said about you, and who said it.' },
  text: { es: 'Texto', en: 'Text', aboutEs: 'Un texto libre: un proyecto, tus servicios…', aboutEn: 'Free text: a project, your services…' },
};

const newId = () => Math.random().toString(36).slice(2, 10);

export function newSection(type: SectionType, lang: Lang, title?: string): Section {
  const base = { id: newId(), title: title ?? t(lang, SECTION_INFO[type].es, SECTION_INFO[type].en) };
  if (type === 'about' || type === 'text') return { ...base, type, text: '' };
  return { ...base, type, items: [] } as Section;
}

// The parts each kind of artist is usually asked for, in the order they are read.
const TEMPLATES: Record<Discipline, Array<[SectionType, string, string]>> = {
  musica: [
    ['about', 'Sobre mí', 'About me'],
    ['files', 'Temas', 'Tracks'],
    ['links', 'Escúchame en', 'Listen on'],
    ['entries', 'Créditos', 'Credits'],
    ['entries', 'Directos', 'Live shows'],
    ['quotes', 'Prensa', 'Press'],
  ],
  visual: [
    ['about', 'Statement', 'Artist statement'],
    ['works', 'Obras seleccionadas', 'Selected works'],
    ['entries', 'Exposiciones', 'Exhibitions'],
    ['entries', 'Premios y becas', 'Awards & grants'],
    ['entries', 'Formación', 'Education'],
    ['files', 'Dossier', 'Portfolio PDF'],
  ],
  fotografia: [
    ['about', 'Sobre mí', 'About me'],
    ['works', 'Proyectos', 'Projects'],
    ['entries', 'Clientes y publicaciones', 'Clients & publications'],
    ['entries', 'Exposiciones', 'Exhibitions'],
    ['entries', 'Premios', 'Awards'],
  ],
  escritura: [
    ['about', 'Sobre mí', 'About me'],
    ['works', 'Textos', 'Writing'],
    ['entries', 'Publicaciones', 'Publications'],
    ['entries', 'Recitales y lecturas', 'Readings'],
    ['quotes', 'Lo que dicen', 'Praise'],
  ],
  audiovisual: [
    ['about', 'Sobre mí', 'About me'],
    ['files', 'Reel', 'Reel'],
    ['works', 'Trabajos', 'Work'],
    ['entries', 'Créditos', 'Credits'],
    ['entries', 'Festivales y premios', 'Festivals & awards'],
  ],
  otro: [
    ['about', 'Sobre mí', 'About me'],
    ['works', 'Obras', 'Works'],
    ['entries', 'Trayectoria', 'Track record'],
    ['links', 'Enlaces', 'Links'],
  ],
};

/**
 * A portfolio already filled with what MAKWIN knows: the bio, the right works, the
 * links of the profile, a cover picture. Nobody starts from an empty page.
 */
export function makeDraft(discipline: Discipline, profile: Profile, works: PortfolioWork[], lang: Lang): PortfolioContent {
  const info = DISCIPLINE_INFO[discipline];
  const matching = info.workTypes.length ? works.filter((work) => info.workTypes.includes(work.work_type)) : works;
  const chosen = (matching.length ? matching : works).slice(0, 12);
  const links = [profile.website, profile.instagram_url, profile.tiktok_url].filter((url): url is string => !!url?.trim());

  const sections: Section[] = TEMPLATES[discipline].map(([type, es, en]) => newSection(type, lang, t(lang, es, en)));
  const about = sections.find((section) => section.type === 'about');
  if (about && about.type === 'about') about.text = profile.bio?.trim() ?? '';

  // Their works on MAKWIN always come in, even where the template had no place for them.
  let worksSection: Section | undefined = sections.find((section) => section.type === 'works');
  if (!worksSection && chosen.length) {
    worksSection = newSection('works', lang, discipline === 'musica' ? t(lang, 'En MAKWIN', 'On MAKWIN') : undefined);
    sections.splice(Math.min(2, sections.length), 0, worksSection);
  }
  if (worksSection?.type === 'works') worksSection.items = chosen.map((work) => ({ id: work.id, note: '' }));

  if (links.length) {
    let linksSection: Section | undefined = sections.find((section) => section.type === 'links');
    if (!linksSection) {
      linksSection = newSection('links', lang);
      sections.push(linksSection);
    }
    if (linksSection.type === 'links') linksSection.items = links.map((url) => ({ id: newId(), url, label: '' }));
  }

  const cover = chosen.find((work) => workPicture(work)) ?? works.find((work) => workPicture(work));
  return {
    discipline,
    design: { ...DEFAULT_DESIGN, style: discipline === 'fotografia' || discipline === 'visual' ? 'galeria' : discipline === 'musica' || discipline === 'audiovisual' ? 'moderno' : 'clasico' },
    info: { ...emptyInfo(), headline: t(lang, info.headlineEs, info.headlineEn), heroWork: cover?.id ?? null },
    sections,
  };
}

/** Nothing worth showing yet (an empty list, an empty text). */
export function isEmptySection(section: Section): boolean {
  if (section.type === 'about' || section.type === 'text') return !section.text.trim();
  return section.items.length === 0;
}

export const ACCENT_LABELS: Record<PortfolioAccent, { es: string; en: string }> = {
  tinta: { es: 'Tinta', en: 'Ink' },
  arcilla: { es: 'Arcilla', en: 'Clay' },
  oliva: { es: 'Oliva', en: 'Olive' },
  oceano: { es: 'Océano', en: 'Ocean' },
  vino: { es: 'Vino', en: 'Wine' },
  oro: { es: 'Oro', en: 'Gold' },
};
