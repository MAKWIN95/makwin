import { Redis } from '@upstash/redis';

// Every email leaves through here. Several free mail services are lined up, each
// with its own daily allowance; an email takes the first one with room and, if that
// one fails, the next. Together they send several times what any one of them gives
// for free. Account emails (confirm, reset password, sign-in link) are urgent and
// always go out at once; the rest leave room for them and, on a very busy day,
// wait in a queue instead of being lost, and leave with the next emails once there is room.

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type Priority = 'urgent' | 'normal';
export type RelayResult =
  | { ok: true; id: string | null; provider: string }
  | { ok: true; queued: true }
  | { ok: false; error: string };

export interface MailProvider {
  name: string;
  /** Emails a day its free plan allows. */
  daily: number;
  send(message: MailMessage): Promise<{ id: string | null }>;
}

/** Share of each day's total kept free for account emails. */
const URGENT_RESERVE = 0.25;
const QUEUE_KEY = 'mail:queue';
const DAY_SECONDS = 60 * 60 * 24;

class ProviderError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

function parseAddress(value: string): { email: string; name?: string } {
  const match = value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (!match) return { email: value.trim() };
  const name = match[1].replace(/^"|"$/g, '');
  return name ? { email: match[2], name } : { email: match[2] };
}

async function reply(response: Response, service: string): Promise<any> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Full, over its allowance or down: the next service takes it. A bad address would fail everywhere.
    const retryable = response.status === 429 || response.status >= 500 || response.status === 401 || response.status === 403 || response.status === 402;
    throw new ProviderError(`${service} ${response.status}: ${body?.message ?? body?.ErrorMessage ?? body?.name ?? 'rejected'}`, retryable);
  }
  return body;
}

export function brevo(apiKey: string, daily = 300): MailProvider {
  return {
    name: 'brevo',
    daily,
    async send(m) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: parseAddress(m.from),
          to: [{ email: m.to }],
          subject: m.subject,
          htmlContent: m.html,
          textContent: m.text,
          ...(m.replyTo ? { replyTo: parseAddress(m.replyTo) } : {}),
        }),
      });
      const body = await reply(response, 'brevo');
      return { id: body?.messageId ?? null };
    },
  };
}

export function mailjet(apiKey: string, secret: string, daily = 200): MailProvider {
  return {
    name: 'mailjet',
    daily,
    async send(m) {
      const from = parseAddress(m.from);
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: { authorization: `Basic ${Buffer.from(`${apiKey}:${secret}`).toString('base64')}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          Messages: [{
            From: { Email: from.email, ...(from.name ? { Name: from.name } : {}) },
            To: [{ Email: m.to }],
            Subject: m.subject,
            HTMLPart: m.html,
            TextPart: m.text,
            ...(m.replyTo ? { ReplyTo: { Email: parseAddress(m.replyTo).email } } : {}),
          }],
        }),
      });
      const body = await reply(response, 'mailjet');
      return { id: body?.Messages?.[0]?.To?.[0]?.MessageID?.toString() ?? null };
    },
  };
}

export function resend(apiKey: string, daily = 100): MailProvider {
  return {
    name: 'resend',
    daily,
    async send(m) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: m.from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
      });
      const body = await reply(response, 'resend');
      return { id: body?.id ?? null };
    },
  };
}

/** The services configured on this server, in the order they are tried. */
export function configuredProviders(env: NodeJS.ProcessEnv = process.env): MailProvider[] {
  const list: MailProvider[] = [];
  if (env.BREVO_API_KEY) list.push(brevo(env.BREVO_API_KEY, Number(env.BREVO_DAILY) || 300));
  if (env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY) list.push(mailjet(env.MAILJET_API_KEY, env.MAILJET_SECRET_KEY, Number(env.MAILJET_DAILY) || 200));
  if (env.RESEND_API_KEY) list.push(resend(env.RESEND_API_KEY, Number(env.RESEND_DAILY) || 100));
  return list;
}

/** Where the day's counts and the waiting emails are kept. */
export interface MailBook {
  sentToday(provider: string): Promise<number>;
  countSent(provider: string): Promise<void>;
  enqueue(item: QueuedMail): Promise<void>;
  takeQueued(max: number): Promise<QueuedMail[]>;
}

export interface QueuedMail {
  message: MailMessage;
  at: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function memoryBook(): MailBook {
  const counts = new Map<string, number>();
  const queue: QueuedMail[] = [];
  return {
    async sentToday(p) { return counts.get(`${p}:${today()}`) ?? 0; },
    async countSent(p) { counts.set(`${p}:${today()}`, (counts.get(`${p}:${today()}`) ?? 0) + 1); },
    async enqueue(item) { queue.push(item); },
    async takeQueued(max) { return queue.splice(0, max); },
  };
}

export function redisBook(redis: Redis): MailBook {
  return {
    async sentToday(p) { return Number(await redis.get(`mail:count:${p}:${today()}`)) || 0; },
    async countSent(p) {
      const key = `mail:count:${p}:${today()}`;
      await redis.incr(key);
      await redis.expire(key, DAY_SECONDS * 2);
    },
    async enqueue(item) { await redis.rpush(QUEUE_KEY, JSON.stringify(item)); },
    async takeQueued(max) {
      const items: QueuedMail[] = [];
      for (let i = 0; i < max; i++) {
        const raw = await redis.lpop<string | QueuedMail>(QUEUE_KEY);
        if (!raw) break;
        items.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
      }
      return items;
    },
  };
}

let sharedBook: MailBook | null = null;
function defaultBook(): MailBook {
  if (sharedBook) return sharedBook;
  const url = process.env.STORAGE_KV_REST_API_URL;
  const token = process.env.STORAGE_KV_REST_API_TOKEN;
  sharedBook = url && token ? redisBook(new Redis({ url, token })) : memoryBook();
  return sharedBook;
}

export interface RelayOptions {
  providers?: MailProvider[];
  book?: MailBook;
  /** After an ordinary email goes out, a few that waited go with it (on by default). */
  drain?: boolean;
}

/** How many waiting emails ride along with each ordinary one: the queue empties on its own, no timer needed. */
const RIDE_ALONG = 3;

export async function relay(message: MailMessage, priority: Priority = 'normal', options: RelayOptions = {}): Promise<RelayResult> {
  const providers = options.providers ?? configuredProviders();
  const book = options.book ?? defaultBook();
  if (!providers.length) return { ok: false, error: 'not_configured' };

  const sent = await Promise.all(providers.map((p) => book.sentToday(p.name).catch(() => 0)));
  const total = providers.reduce((n, p) => n + p.daily, 0);
  const used = sent.reduce((n, s) => n + s, 0);
  if (priority === 'normal' && total - used <= total * URGENT_RESERVE) {
    await book.enqueue({ message, at: Date.now() });
    return { ok: true, queued: true };
  }

  // Services with room first, in order; when all say they are full, urgent mail still tries each one.
  const order = providers
    .map((p, i) => ({ p, room: p.daily - sent[i] }))
    .sort((a, b) => Number(b.room > 0) - Number(a.room > 0));
  let lastError = 'send_failed';
  let refused = false;
  for (const { p, room } of order) {
    if (room <= 0 && priority === 'normal') continue;
    try {
      const { id } = await p.send(message);
      await book.countSent(p.name).catch(() => undefined);
      if (priority === 'normal' && options.drain !== false) {
        await flushQueue({ providers, book, max: RIDE_ALONG }).catch((error) => console.error('[MAIL] Queue not drained:', error?.message ?? error));
      }
      return { ok: true, id, provider: p.name };
    } catch (error: any) {
      lastError = error?.message ?? String(error);
      console.error(`[MAIL] ${p.name} could not send:`, lastError);
      if (error instanceof ProviderError && !error.retryable) {
        refused = true;
        break;
      }
    }
  }
  // Refused for itself (a bad address, say) it would fail again tomorrow: only a lack of room waits.
  if (priority === 'normal' && !refused) {
    await book.enqueue({ message, at: Date.now() });
    return { ok: true, queued: true };
  }
  return { ok: false, error: lastError };
}

/** Sends what waited for room; anything still without room waits again. */
export async function flushQueue(options: RelayOptions & { max?: number } = {}): Promise<{ sent: number; waiting: number }> {
  const book = options.book ?? defaultBook();
  const items = await book.takeQueued(options.max ?? 200);
  let sent = 0;
  for (const [index, item] of items.entries()) {
    const result = await relay(item.message, 'normal', { ...options, book, drain: false });
    if (result.ok && !('queued' in result)) {
      sent += 1;
    } else {
      // No room left today: what was taken goes back, in its order, for tomorrow.
      if (!result.ok) await book.enqueue(item);
      for (const rest of items.slice(index + 1)) await book.enqueue(rest);
      return { sent, waiting: items.length - index };
    }
  }
  return { sent, waiting: 0 };
}
