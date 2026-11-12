import { createHash, createHmac } from 'node:crypto';

// The works' files live in Cloudflare R2 when it is set up: 10 GB free and nobody
// pays for the photos being seen, however many times. The artist's phone sends each
// file straight there with a one-use permission signed here, so a file never passes
// through our server and only lands in that artist's own folder, at the size it said.
// Without the settings everything stays in Supabase as before.

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Where the files are seen, e.g. https://media.makwin.art */
  publicUrl: string;
}

export function r2Config(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return {
    accountId: R2_ACCOUNT_ID.trim(),
    accessKeyId: R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: R2_SECRET_ACCESS_KEY.trim(),
    bucket: R2_BUCKET.trim(),
    publicUrl: R2_PUBLIC_URL.trim().replace(/\/+$/, ''),
  };
}

/** RFC 3986, as the signature wants it: only letters, digits and -._~ stay as they are. */
function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodePath(path: string): string {
  return path.split('/').map(encode).join('/');
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest();

export interface PresignInput {
  method: string;
  host: string;
  /** Already starting with "/", not yet encoded. */
  path: string;
  query?: Record<string, string>;
  /** Headers the request must carry exactly: their names and values are part of the signature. */
  headers?: Record<string, string>;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  service?: string;
  /** Seconds the address works for. */
  expires?: number;
  now?: Date;
}

/** An address that does one thing (put, delete, list) for a little while, signed AWS-style (Signature V4). */
export function presign(input: PresignInput): string {
  const region = input.region ?? 'auto';
  const service = input.service ?? 's3';
  const now = input.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${region}/${service}/aws4_request`;

  const headers: Record<string, string> = { host: input.host };
  for (const [name, value] of Object.entries(input.headers ?? {})) headers[name.toLowerCase()] = String(value).trim();
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(';');

  const query: Record<string, string> = {
    ...(input.query ?? {}),
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${input.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expires ?? 600),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((name) => `${encode(name)}=${encode(query[name])}`)
    .join('&');
  const canonicalPath = encodePath(input.path);

  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalPath,
    canonicalQuery,
    headerNames.map((name) => `${name}:${headers[name]}\n`).join(''),
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');

  const key = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), region), service), 'aws4_request');
  const signature = createHmac('sha256', key).update(stringToSign).digest('hex');
  return `https://${input.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function endpoint(config: R2Config) {
  return `${config.accountId}.r2.cloudflarestorage.com`;
}

function sign(config: R2Config, method: string, key: string | null, extra: Partial<PresignInput> = {}): string {
  return presign({
    method,
    host: endpoint(config),
    path: key === null ? `/${config.bucket}` : `/${config.bucket}/${key}`,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    ...extra,
  });
}

/** Every file has its own name, so a copy kept for a year never goes stale. */
export const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** What the phone must send with the file: anything else (another size, another type) is turned away by R2. */
export function uploadHeaders(type: string, size: number): Record<string, string> {
  return { 'content-type': type, 'content-length': String(size), 'cache-control': CACHE_CONTROL };
}

/** The same, minus the size, which the browser always sends by itself and will not let a page set. */
export function browserHeaders(type: string): Record<string, string> {
  return { 'content-type': type, 'cache-control': CACHE_CONTROL };
}

/** A one-off address the server itself uses to put or look at a file (not handed to browsers). */
export function signedFor(config: R2Config, method: 'PUT' | 'HEAD' | 'GET', key: string, headers: Record<string, string> = {}): string {
  return sign(config, method, key, { headers, expires: 5 * 60 });
}

export function signedUpload(config: R2Config, key: string, type: string, size: number): string {
  return sign(config, 'PUT', key, { headers: uploadHeaders(type, size), expires: 15 * 60 });
}

export function publicUrlOf(config: R2Config, key: string): string {
  return `${config.publicUrl}/${encodePath(key)}`;
}

/** The file's name inside the bucket, if this address is one of ours. */
export function keyOf(config: R2Config | null, url: string | null | undefined): string | null {
  if (!config || !url) return null;
  const prefix = `${config.publicUrl}/`;
  if (!url.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(url.slice(prefix.length).split('?')[0]);
  } catch {
    return null;
  }
}

/** Removes these files. One that cannot go is only wasted space, so it never fails what was asked. */
export async function removeObjects(config: R2Config, keys: string[]): Promise<void> {
  await Promise.all(keys.map(async (key) => {
    try {
      const response = await fetch(sign(config, 'DELETE', key), { method: 'DELETE' });
      if (!response.ok && response.status !== 404) console.error('[R2] Could not remove', key, response.status);
    } catch (error: any) {
      console.error('[R2] Could not remove', key, error?.message ?? error);
    }
  }));
}

function unescapeXml(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/** Every file whose name starts with this, however many there are. */
export async function listObjects(config: R2Config, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | null = null;
  do {
    const query: Record<string, string> = { 'list-type': '2', prefix, ...(token ? { 'continuation-token': token } : {}) };
    const response = await fetch(sign(config, 'GET', null, { query }));
    const body = await response.text();
    if (!response.ok) throw new Error(`R2 list ${response.status}`);
    for (const match of body.matchAll(/<Key>([\s\S]*?)<\/Key>/g)) keys.push(unescapeXml(match[1]));
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(body);
    token = truncated ? unescapeXml(body.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] ?? '') || null : null;
  } while (token);
  return keys;
}
