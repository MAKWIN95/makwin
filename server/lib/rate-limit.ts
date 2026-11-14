import { Redis } from '@upstash/redis';

// How often one person may knock on a door before it is closed for a while. Counted in
// Redis so every server instance shares the count. If Redis is missing or fails, the
// door stays open: a slow day for Redis must never lock real artists out.

export interface Limit {
  /** Name of the door, kept apart from the others. */
  name: string;
  /** Requests allowed inside one window. */
  max: number;
  /** Length of the window, in seconds. */
  seconds: number;
}

export const LIMITS = {
  checkEmail: { name: 'check-email', max: 20, seconds: 10 * 60 },
  checkUsername: { name: 'check-username', max: 120, seconds: 10 * 60 },
  helpMessage: { name: 'help-message', max: 5, seconds: 60 * 60 },
  publishWork: { name: 'publish-work', max: 20, seconds: 60 * 60 },
  signUploads: { name: 'sign-uploads', max: 60, seconds: 60 * 60 },
  report: { name: 'report', max: 30, seconds: 60 * 60 },
} satisfies Record<string, Limit>;

type Counter = Pick<Redis, 'incr' | 'expire'>;

let shared: Counter | null | undefined;
function counter(): Counter | null {
  if (shared !== undefined) return shared;
  const url = process.env.STORAGE_KV_REST_API_URL;
  const token = process.env.STORAGE_KV_REST_API_TOKEN;
  try {
    shared = url && token ? new Redis({ url, token }) : null;
  } catch (error) {
    console.error('[RATE-LIMIT] Counter not configured:', (error as Error)?.message);
    shared = null;
  }
  return shared;
}

/** For tests: count with this instead of Redis (null = no counter at all). */
export function useCounter(next: Counter | null | undefined) {
  shared = next;
}

type Headers = Record<string, string | string[] | undefined>;

/** The visitor's address as Vercel saw it; the first hop only, never what the browser claims further down. */
export function clientIp(headers: Headers | undefined): string {
  const pick = (name: string) => {
    const value = headers?.[name];
    return (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim() || '';
  };
  return pick('x-vercel-forwarded-for') || pick('x-real-ip') || pick('x-forwarded-for') || 'unknown';
}

/** True while `who` is still inside the limit; counts this request. */
export async function allow(limit: Limit, who: string): Promise<boolean> {
  const redis = counter();
  if (!redis) return true;
  const window = Math.floor(Date.now() / 1000 / limit.seconds);
  const key = `rl:${limit.name}:${who}:${window}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, limit.seconds);
    return count <= limit.max;
  } catch (error) {
    console.error('[RATE-LIMIT] Counter unavailable, letting the request through:', (error as Error)?.message);
    return true;
  }
}

/** The answer when the limit is reached, in the same words for every door. */
export function tooMany(res: { setHeader(name: string, value: string): unknown; status(code: number): { json(body: unknown): unknown } }, limit: Limit) {
  res.setHeader('Retry-After', String(limit.seconds));
  return res.status(429).json({ error: 'Demasiados intentos. Espera un poco y vuelve a probar.', code: 'rate_limited' });
}
