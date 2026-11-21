import type { SupabaseClient } from '@supabase/supabase-js';
import { keyOf, listObjectsDated, removeObjects, type R2Config } from './r2.js';
import { withSmallCopies } from '../../shared/photo-paths.js';

/** Untouched this long before it may go: long enough for undo, slow uploads and drafts kept on a device. */
export const ORPHAN_MIN_AGE_MS = 14 * 24 * 60 * 60 * 1000;
/** More than this at once means something is wrong (a list that failed to load…): nothing is removed. */
export const ORPHAN_MAX_AT_ONCE = 300;
const ARTIST_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//;

/**
 * The artists' files that nothing uses any more: not a work, not a portfolio, not an avatar.
 * Only files inside an artist's folder are ever considered (never backups or anything else),
 * each with its light copy counted as used when the photo is.
 */
export function orphanKeys(
  files: Array<{ key: string; modified: number }>,
  usedKeys: Iterable<string>,
  now: number,
  minAgeMs = ORPHAN_MIN_AGE_MS,
): string[] {
  const used = new Set(withSmallCopies([...usedKeys]));
  return files
    .filter((file) => ARTIST_FILE.test(file.key) && !used.has(file.key) && now - file.modified >= minAgeMs)
    .map((file) => file.key);
}

/** Every address of ours inside anything stored as JSON (a portfolio, a list of pictures). */
export function addressesIn(value: unknown, publicUrl: string): string[] {
  const text = JSON.stringify(value ?? null);
  const escaped = publicUrl.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return [...text.matchAll(new RegExp(`${escaped}/[^"\\\\\\s]+`, 'g'))].map((match) => match[0]);
}

async function allRows<T>(admin: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if ((data ?? []).length < 1000) return rows;
  }
}

/** Removes the files nobody uses any more. If anything cannot be read, nothing is removed. */
export async function sweepOrphanFiles(admin: SupabaseClient, r2: R2Config, now = Date.now()) {
  const [works, portfolios, profiles] = await Promise.all([
    allRows<{ file_url: string | null; cover_url: string | null; extra_images: string[] | null }>(admin, 'works', 'file_url, cover_url, extra_images'),
    allRows<{ content: unknown; public_content: unknown }>(admin, 'portfolios', 'content, public_content'),
    allRows<{ avatar_url: string | null }>(admin, 'profiles', 'avatar_url'),
  ]);
  const urls = [
    ...works.flatMap((work) => [work.file_url, work.cover_url, ...(work.extra_images ?? [])]),
    ...portfolios.flatMap((row) => [...addressesIn(row.content, r2.publicUrl), ...addressesIn(row.public_content, r2.publicUrl)]),
    ...profiles.map((profile) => profile.avatar_url),
  ];
  const usedKeys = urls.map((url) => keyOf(r2, url)).filter((key): key is string => !!key);
  const files = await listObjectsDated(r2, '');
  const orphans = orphanKeys(files, usedKeys, now);
  if (orphans.length > ORPHAN_MAX_AT_ONCE) {
    console.warn('[ORPHANS] Too many at once, nothing removed:', orphans.length);
    return { checked: files.length, orphans: orphans.length, removed: 0, skipped: true };
  }
  if (orphans.length) await removeObjects(r2, orphans);
  return { checked: files.length, orphans: orphans.length, removed: orphans.length, skipped: false };
}
