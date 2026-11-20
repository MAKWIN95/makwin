// An artist's portfolio: what it holds, and the one place that decides what may be
// saved. The page and the server both read this, so they always agree.

export const VISIBILITIES = ['private', 'link', 'public'] as const;
export type PortfolioVisibility = (typeof VISIBILITIES)[number];

export const DISCIPLINES = ['musica', 'visual', 'fotografia', 'escritura', 'audiovisual', 'otro'] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const STYLES = ['clasico', 'galeria', 'moderno'] as const;
export type PortfolioStyle = (typeof STYLES)[number];

export const TONES = ['claro', 'oscuro'] as const;
export type PortfolioTone = (typeof TONES)[number];

export const ACCENTS = ['tinta', 'arcilla', 'oliva', 'oceano', 'vino', 'oro'] as const;
export type PortfolioAccent = (typeof ACCENTS)[number];

export const SECTION_TYPES = ['about', 'works', 'entries', 'files', 'links', 'quotes', 'text'] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const FILE_KINDS = ['image', 'audio', 'video', 'pdf'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export interface PortfolioDesign {
  style: PortfolioStyle;
  tone: PortfolioTone;
  accent: PortfolioAccent;
}

export interface PortfolioInfo {
  /** One line under the name: "Productor musical", "Pintora". */
  headline: string;
  location: string;
  /** Shown only if the artist writes it here: their account email is never used. */
  email: string;
  /** "Disponible para encargos". */
  available: boolean;
  /** The big picture at the top: one of their works, or a file of their own. */
  heroWork: string | null;
  heroImage: string | null;
}

export interface WorkPick { id: string; note: string }
export interface Entry { id: string; year: string; title: string; detail: string; link: string }
export interface PortfolioFile { id: string; url: string; kind: FileKind; name: string; note: string }
export interface LinkItem { id: string; url: string; label: string }
export interface Quote { id: string; text: string; source: string }

interface Base { id: string; title: string; hidden?: boolean }
export type Section =
  | (Base & { type: 'about'; text: string })
  | (Base & { type: 'text'; text: string })
  | (Base & { type: 'works'; items: WorkPick[] })
  | (Base & { type: 'entries'; items: Entry[] })
  | (Base & { type: 'files'; items: PortfolioFile[] })
  | (Base & { type: 'links'; items: LinkItem[] })
  | (Base & { type: 'quotes'; items: Quote[] });

export interface PortfolioContent {
  discipline: Discipline;
  design: PortfolioDesign;
  info: PortfolioInfo;
  sections: Section[];
}

/** What the page receives: the owner gets everything, anyone else only what may be seen. */
export interface PortfolioRecord {
  user_id: string;
  visibility: PortfolioVisibility;
  content: PortfolioContent;
  updated_at: string;
  mine: boolean;
  share_key: string | null;
  checked_media: string[] | null;
  held_media: string[] | null;
}

export const LIMITS = {
  sections: 16,
  items: 60,
  works: 40,
  files: 30,
  title: 80,
  short: 120,
  line: 200,
  text: 4000,
  quote: 600,
  url: 500,
  /** How much a whole portfolio may weigh when saved, in characters. */
  saved: 200_000,
  /** File sizes, in bytes. */
  bytes: { image: 15 * 1024 * 1024, audio: 20 * 1024 * 1024, video: 25 * 1024 * 1024, pdf: 10 * 1024 * 1024 },
} as const;

export const DEFAULT_DESIGN: PortfolioDesign = { style: 'clasico', tone: 'claro', accent: 'tinta' };

export function emptyInfo(): PortfolioInfo {
  return { headline: '', location: '', email: '', available: false, heroWork: null, heroImage: null };
}

/** Which kind of file a browser type is, if a portfolio may hold it. */
export function fileKindOf(type: string): FileKind | null {
  const kind = type.toLowerCase();
  if (kind === 'application/pdf') return 'pdf';
  if (kind.includes('svg')) return null;
  if (kind.startsWith('image/')) return 'image';
  if (kind.startsWith('audio/')) return 'audio';
  if (kind.startsWith('video/')) return 'video';
  return null;
}

// ---- Cleaning what arrives ------------------------------------------------------

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[^\s@<>()[\]\\,;:"]{1,190}\.[a-z]{2,}$/i;

function text(value: unknown, max: number): string {
  // Control characters never reach the page; line breaks and tabs do.
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function line(value: unknown, max: number): string {
  return text(value, max).replace(/\s+/g, ' ');
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function idOf(value: unknown, used: Set<string>): string {
  let id = ID.test(String(value ?? '')) ? String(value) : '';
  while (!id || used.has(id)) id = Math.random().toString(36).slice(2, 10);
  used.add(id);
  return id;
}

/** A link typed by someone, only ever as a web page. */
export function safeWebUrl(value: unknown): string {
  const raw = text(value, LIMITS.url);
  if (!raw) return '';
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    if (!url.hostname.includes('.')) return '';
    return url.href.slice(0, LIMITS.url);
  } catch {
    return '';
  }
}

function list<T>(value: unknown, max: number, each: (item: Record<string, unknown>, used: Set<string>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  const out: T[] = [];
  for (const item of value) {
    if (out.length >= max) break;
    if (!item || typeof item !== 'object') continue;
    const cleaned = each(item as Record<string, unknown>, used);
    if (cleaned) out.push(cleaned);
  }
  return out;
}

export interface CleanOptions {
  /** True when this address is a file the artist uploaded themselves. */
  ownFile: (url: string) => boolean;
}

/**
 * Turns whatever arrived into a portfolio that may be saved: known parts only, every
 * text cut to size, links only to web pages and files only from the artist's own folder.
 */
export function cleanPortfolio(raw: unknown, { ownFile }: CleanOptions): PortfolioContent {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const design = (input.design && typeof input.design === 'object' ? input.design : {}) as Record<string, unknown>;
  const info = (input.info && typeof input.info === 'object' ? input.info : {}) as Record<string, unknown>;
  const email = line(info.email, LIMITS.short);
  const heroImage = String(info.heroImage ?? '');

  const sectionIds = new Set<string>();
  let fileCount = 0;
  const sections = list<Section>(input.sections, LIMITS.sections, (section, used) => {
    const type = section.type as SectionType;
    if (!SECTION_TYPES.includes(type)) return null;
    const base = { id: idOf(section.id, sectionIds), title: line(section.title, LIMITS.title), ...(section.hidden === true ? { hidden: true } : {}) };
    void used;
    switch (type) {
      case 'about':
      case 'text':
        return { ...base, type, text: text(section.text, LIMITS.text) };
      case 'works':
        return {
          ...base,
          type,
          items: list(section.items, LIMITS.works, (item, ids) => {
            const id = String(item.id ?? '');
            if (!UUID.test(id) || ids.has(id)) return null;
            ids.add(id);
            return { id, note: line(item.note, LIMITS.line) };
          }),
        };
      case 'entries':
        return {
          ...base,
          type,
          items: list(section.items, LIMITS.items, (item, ids) => {
            const entry = {
              id: idOf(item.id, ids),
              year: line(item.year, 20),
              title: line(item.title, LIMITS.line),
              detail: line(item.detail, LIMITS.line),
              link: safeWebUrl(item.link),
            };
            return entry.year || entry.title || entry.detail || entry.link ? entry : null;
          }),
        };
      case 'files':
        return {
          ...base,
          type,
          items: list(section.items, LIMITS.files, (item, ids) => {
            const url = String(item.url ?? '');
            const kind = item.kind as FileKind;
            if (!FILE_KINDS.includes(kind) || !ownFile(url) || fileCount >= LIMITS.files) return null;
            fileCount += 1;
            return { id: idOf(item.id, ids), url, kind, name: line(item.name, LIMITS.short), note: line(item.note, LIMITS.line) };
          }),
        };
      case 'links':
        return {
          ...base,
          type,
          items: list(section.items, LIMITS.items, (item, ids) => {
            const url = safeWebUrl(item.url);
            return url ? { id: idOf(item.id, ids), url, label: line(item.label, LIMITS.short) } : null;
          }),
        };
      case 'quotes':
        return {
          ...base,
          type,
          items: list(section.items, LIMITS.items, (item, ids) => {
            const quote = { id: idOf(item.id, ids), text: text(item.text, LIMITS.quote), source: line(item.source, LIMITS.short) };
            return quote.text ? quote : null;
          }),
        };
      default:
        return null;
    }
  });

  return {
    discipline: pick(input.discipline, DISCIPLINES, 'otro'),
    design: {
      style: pick(design.style, STYLES, DEFAULT_DESIGN.style),
      tone: pick(design.tone, TONES, DEFAULT_DESIGN.tone),
      accent: pick(design.accent, ACCENTS, DEFAULT_DESIGN.accent),
    },
    info: {
      headline: line(info.headline, LIMITS.short),
      location: line(info.location, LIMITS.short),
      email: EMAIL.test(email) ? email : '',
      available: info.available === true,
      heroWork: UUID.test(String(info.heroWork ?? '')) ? String(info.heroWork) : null,
      heroImage: heroImage && ownFile(heroImage) ? heroImage : null,
    },
    sections,
  };
}

/** Every uploaded picture or video in it: these need the automatic check before others see them. */
export function mediaToCheck(content: PortfolioContent): Array<{ url: string; kind: 'image' | 'video' }> {
  const found = new Map<string, 'image' | 'video'>();
  if (content.info.heroImage) found.set(content.info.heroImage, 'image');
  for (const section of content.sections) {
    if (section.type !== 'files') continue;
    for (const file of section.items) {
      if (file.kind === 'image' || file.kind === 'video') found.set(file.url, file.kind);
    }
  }
  return [...found].map(([url, kind]) => ({ url, kind }));
}

/**
 * What everyone else sees: hidden parts left out, and uploaded pictures or videos only
 * once the automatic check has let them through.
 */
export function publicView(content: PortfolioContent, checked: Iterable<string>): PortfolioContent {
  const passed = new Set(checked);
  return {
    ...content,
    info: { ...content.info, heroImage: content.info.heroImage && passed.has(content.info.heroImage) ? content.info.heroImage : null },
    sections: content.sections
      .filter((section) => !section.hidden)
      .map((section) => (section.type === 'files'
        ? { ...section, items: section.items.filter((file) => (file.kind !== 'image' && file.kind !== 'video') || passed.has(file.url)) }
        : section)),
  };
}

/** Every piece of text in it, for the word check. */
export function textsOf(content: PortfolioContent): string[] {
  const texts = [content.info.headline, content.info.location];
  for (const section of content.sections) {
    texts.push(section.title);
    if (section.type === 'about' || section.type === 'text') texts.push(section.text);
    if (section.type === 'works') texts.push(...section.items.map((item) => item.note));
    if (section.type === 'entries') texts.push(...section.items.flatMap((item) => [item.year, item.title, item.detail]));
    if (section.type === 'files') texts.push(...section.items.flatMap((item) => [item.name, item.note]));
    if (section.type === 'links') texts.push(...section.items.map((item) => item.label));
    if (section.type === 'quotes') texts.push(...section.items.flatMap((item) => [item.text, item.source]));
  }
  return texts.filter(Boolean);
}
