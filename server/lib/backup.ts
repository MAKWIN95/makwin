import { gzipSync } from 'node:zlib';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listObjects, removeObjects, signedFor, type R2Config } from './r2.js';

// MAKWIN's own daily copy of the database. Every table (found by asking the database
// what it has) and every account go into one compressed file in a private bucket
// that nobody can open from the web. Copies older than KEEP_DAYS are removed, so an
// account someone deleted is gone from the copies too within that time.

export const BACKUP_BUCKET = 'makwin-backups';
export const KEEP_DAYS = 30;
const PAGE = 1000;

export function backupKey(day: Date): string {
  return `db/${day.toISOString().slice(0, 10)}.json.gz`;
}

/** Which copies are past their time, judged by the day in their name. */
export function expiredKeys(keys: string[], now: Date, keepDays = KEEP_DAYS): string[] {
  const firstKept = new Date(now.getTime() - keepDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return keys.filter((key) => {
    const day = key.match(/^db\/(\d{4}-\d{2}-\d{2})\.json\.gz$/)?.[1];
    return day ? day < firstKept : false;
  });
}

interface Source {
  url: string;
  serviceKey: string;
  admin: SupabaseClient;
}

async function describeDatabase(source: Source): Promise<{ spec: any; tables: string[] }> {
  const response = await fetch(`${source.url}/rest/v1/`, {
    headers: { apikey: source.serviceKey, Authorization: `Bearer ${source.serviceKey}`, Accept: 'application/openapi+json' },
  });
  if (!response.ok) throw new Error(`database description ${response.status}`);
  const spec = await response.json();
  const tables = Object.keys(spec?.definitions ?? {}).sort();
  return { spec, tables };
}

async function readTable(source: Source, table: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const response = await fetch(`${source.url}/rest/v1/${encodeURIComponent(table)}?select=*`, {
      headers: {
        apikey: source.serviceKey,
        Authorization: `Bearer ${source.serviceKey}`,
        'Range-Unit': 'items',
        Range: `${from}-${from + PAGE - 1}`,
      },
    });
    if (!response.ok) throw new Error(`table ${table} ${response.status}`);
    const page = (await response.json()) as unknown[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function readAccounts(source: Source): Promise<unknown[]> {
  const users: unknown[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await source.admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < PAGE) return users;
  }
}

async function exists(config: R2Config, key: string): Promise<boolean> {
  const response = await fetch(signedFor(config, 'HEAD', key), { method: 'HEAD' });
  return response.ok;
}

export interface BackupResult {
  key: string;
  skipped?: boolean;
  tables?: number;
  rows?: number;
  accounts?: number;
  bytes?: number;
  removed?: number;
}

/** Makes today's copy, once a day; asking again the same day does nothing. */
export async function runBackup(source: Source, storage: R2Config, now = new Date()): Promise<BackupResult> {
  const config = { ...storage, bucket: BACKUP_BUCKET };
  const key = backupKey(now);
  if (await exists(config, key)) return { key, skipped: true };

  const { spec, tables } = await describeDatabase(source);
  const data: Record<string, unknown[]> = {};
  let rows = 0;
  for (const table of tables) {
    data[table] = await readTable(source, table);
    rows += data[table].length;
  }
  const accounts = await readAccounts(source);

  const body = gzipSync(JSON.stringify({ version: 1, created: now.toISOString(), tables: data, accounts, schema: spec }));
  const headers = { 'content-type': 'application/gzip', 'content-length': String(body.length) };
  const response = await fetch(signedFor(config, 'PUT', key, headers), { method: 'PUT', headers, body: new Uint8Array(body) });
  if (!response.ok) throw new Error(`backup upload ${response.status}`);

  const old = expiredKeys(await listObjects(config, 'db/'), now);
  if (old.length) await removeObjects(config, old);

  return { key, tables: tables.length, rows, accounts: accounts.length, bytes: body.length, removed: old.length };
}
