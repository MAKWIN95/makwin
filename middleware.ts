import { next } from '@vercel/functions/middleware';
import { paginaEspera } from './server/espera/pagina';

// The waiting room (v1.1.33). While it is on, makwin.art is closed: every address answers
// with the countdown page and its early-access password box, and nothing else of the site
// (pages, code, API, files) is served until the visitor has entered the password.
//
// Why it can't be skipped: this runs on Vercel before anything is served or cached, so the
// site's code never reaches a visitor without the pass. The pass is a cookie the browser
// can't read or write by script (HttpOnly), signed with a server secret (HMAC-SHA256) and
// dated; changing a letter or the date breaks the signature. The password is only compared
// here, on the server, and each address gets a few tries per 10 minutes.
//
// To open the site for everyone: set ESPERA_ACTIVA to false and publish.

export const ESPERA_ACTIVA = true;

/** When the countdown reaches zero: 12 Dec 2026, 20:00 in Madrid. Shown only; the site stays closed until ESPERA_ACTIVA is false. */
export const LANZAMIENTO = '2026-12-12T19:00:00Z';

export const COOKIE = 'makwin_acceso';
const PASS_DAYS = 120;
export const ENTRY_PATH = '/__acceso';
const TRIES = { max: 8, seconds: 10 * 60 };

/** The only files a visitor without the pass may load: exactly these addresses, nothing below them. */
const OPEN_FILES = new Set([
  '/espera/espera.css',
  '/espera/espera.js',
  '/espera/inter-400.woff2',
  '/espera/inter-600.woff2',
  '/espera/inter-800.woff2',
  '/theme-boot.js',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/manifest.json',
  '/compartir.png',
  '/robots.txt',
]);

type Env = Record<string, string | undefined>;
const env = (): Env => (typeof process !== 'undefined' ? process.env : {}) as Env;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

/** Same-length comparison that takes the same time wherever the first difference is. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** A new signed pass, valid for PASS_DAYS. */
export async function makePass(secret: string, now = Date.now()): Promise<string> {
  const until = Math.floor(now / 1000) + PASS_DAYS * 86400;
  return `${until}.${await hmac(secret, `acceso:${until}`)}`;
}

/** True only for a pass this server signed and whose date has not passed. */
export async function validPass(value: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value || !secret) return false;
  const m = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!m) return false;
  if (Number(m[1]) * 1000 <= now) return false;
  return sameText(m[2], await hmac(secret, `acceso:${m[1]}`));
}

/** Passwords are forgiving about capitals, accents, spaces and dashes: «Lienzo Azul» = «lienzo-azul». */
export function normalise(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s\-_.·]+/g, '');
}

/** Compares the typed password with every accepted one (comma-separated in the setting). */
export async function rightPassword(typed: string, setting: string | undefined): Promise<boolean> {
  if (!setting || typeof typed !== 'string' || typed.length > 200) return false;
  const digest = async (t: string) => b64url(await crypto.subtle.digest('SHA-256', enc.encode(normalise(t))));
  const mine = await digest(typed);
  let ok = false;
  for (const p of setting.split(',')) {
    if (normalise(p)) ok = sameText(mine, await digest(p)) || ok;
  }
  return ok && normalise(typed).length > 0;
}

function cookieFrom(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

function visitorAddress(req: Request): string {
  const first = (h: string) => req.headers.get(h)?.split(',')[0]?.trim() || '';
  return first('x-vercel-forwarded-for') || first('x-real-ip') || first('x-forwarded-for') || 'desconocida';
}

/** Counts one try for this address in Redis; true while it is within the limit. Without Redis the password still guards the door. */
async function mayTry(req: Request): Promise<boolean> {
  const { STORAGE_KV_REST_API_URL: url, STORAGE_KV_REST_API_TOKEN: token } = env();
  if (!url || !token) return true;
  const key = `rl:espera:${visitorAddress(req)}:${Math.floor(Date.now() / 1000 / TRIES.seconds)}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(TRIES.seconds)]]),
    });
    const out = (await res.json()) as Array<{ result?: number }>;
    const count = Number(out?.[0]?.result ?? 0);
    return count <= TRIES.max;
  } catch {
    return true;
  }
}

const json = (status: number, body: unknown, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });

async function enter(req: Request): Promise<Response> {
  const { EARLY_ACCESS_PASSWORD: password, GATE_SECRET: secret } = env();
  if (!(await mayTry(req))) return json(429, { error: 'Demasiados intentos. Espera unos minutos.' }, { 'Retry-After': String(TRIES.seconds) });
  let typed = '';
  try {
    const body = (await req.json()) as { clave?: unknown };
    typed = typeof body?.clave === 'string' ? body.clave : '';
  } catch { /* an empty or broken body is just a wrong password */ }
  if (!secret || !(await rightPassword(typed, password))) return json(401, { error: 'Esa no es. Sigue buscando.' });
  const pass = await makePass(secret);
  return json(200, { ok: true }, {
    'Set-Cookie': `${COOKIE}=${pass}; Path=/; Max-Age=${PASS_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
  });
}

/** Vercel's nightly schedule calls the backup with CRON_SECRET; it has no browser and no pass. */
function fromSchedule(req: Request, url: URL): boolean {
  const secret = env().CRON_SECRET;
  return Boolean(secret) && url.pathname === '/api/reports' && sameText(req.headers.get('authorization') || '', `Bearer ${secret}`);
}

export default async function middleware(req: Request): Promise<Response> {
  if (!ESPERA_ACTIVA) return next();
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === ENTRY_PATH) {
    return req.method === 'POST' ? enter(req) : json(405, { error: 'Solo con el formulario.' }, { Allow: 'POST' });
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && OPEN_FILES.has(path)) return next();
  if (fromSchedule(req, url)) return next();
  if (await validPass(cookieFrom(req, COOKIE), env().GATE_SECRET)) return next();

  // No pass: the site's code, files and API stay shut.
  if (path.startsWith('/api/')) return json(401, { error: 'La web está cerrada hasta el lanzamiento.', code: 'espera' });
  const lastPart = path.split('/').pop() || '';
  const isFile = /\.[a-z0-9]{1,8}$/i.test(lastPart);
  const wantsPage = (req.method === 'GET' || req.method === 'HEAD') && (!isFile || lastPart.endsWith('.html'));
  if (!wantsPage) return new Response('La web está cerrada hasta el lanzamiento.', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

  return new Response(req.method === 'HEAD' ? null : paginaEspera(LANZAMIENTO), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex',
    },
  });
}
