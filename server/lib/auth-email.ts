import { createHmac, timingSafeEqual } from 'node:crypto';
import { AUTH_EMAILS } from './auth-email-copy.js';
import { renderEmail, type EmailLanguage } from './email-layout.js';
import type { MailMessage } from './mail-relay.js';

// Supabase hands every account email to us (its "send email" hook) instead of sending
// it itself, so these go through the same free services as the rest, first in line.

/** Which of our emails answers each thing Supabase asks to send. */
const TEMPLATE_FOR: Record<string, string> = {
  signup: 'confirm-email',
  invite: 'invite',
  magiclink: 'magic-link',
  email: 'magic-link',
  recovery: 'reset-password',
  email_change: 'change-email',
  reauthentication: 'reauthentication',
  password_changed_notification: 'password-changed',
  email_changed_notification: 'email-changed',
  phone_changed_notification: 'phone-changed',
  identity_linked_notification: 'signin-linked',
  identity_unlinked_notification: 'signin-removed',
  mfa_factor_enrolled_notification: 'mfa-added',
  mfa_factor_unenrolled_notification: 'mfa-removed',
};

export interface HookPayload {
  user: {
    email?: string;
    new_email?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type: string;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
    provider?: string;
  };
}

/** Standard Webhooks: the body is signed with the hook's secret, and only a fresh, matching signature passes. */
export function verifyHook(rawBody: string, headers: Record<string, string | string[] | undefined>, secret: string, now = Date.now()): boolean {
  const header = (name: string) => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const id = header('webhook-id');
  const timestamp = header('webhook-timestamp');
  const signatures = header('webhook-signature');
  if (!id || !timestamp || !signatures || !secret) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^v1,/, '').replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return signatures.split(' ').some((part) => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

function verifyUrl(supabaseUrl: string, tokenHash: string, type: string, redirectTo?: string): string {
  const params = new URLSearchParams({ token: tokenHash, type, ...(redirectTo ? { redirect_to: redirectTo } : {}) });
  return `${supabaseUrl.replace(/\/$/, '')}/auth/v1/verify?${params.toString()}`;
}

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_, name: string) => values[name] ?? '');
}

/** The emails to send for one request: usually one, two for a secure email change. */
export function buildAuthEmails(payload: HookPayload, supabaseUrl: string, from: string): MailMessage[] {
  const { user, email_data: data } = payload;
  const name = TEMPLATE_FOR[data.email_action_type];
  const copyByLanguage = name ? AUTH_EMAILS[name] : undefined;
  if (!copyByLanguage || !user.email) return [];
  const language: EmailLanguage = user.user_metadata?.language_preference === 'en' ? 'en' : 'es';
  const copy = copyByLanguage[language];

  const compose = (to: string, tokenHash: string | undefined, token: string | undefined): MailMessage => {
    const values: Record<string, string> = {
      ConfirmationURL: tokenHash ? verifyUrl(supabaseUrl, tokenHash, data.email_action_type, data.redirect_to) : '',
      Token: token ?? '',
      Email: user.email ?? '',
      NewEmail: user.new_email ?? '',
      OldEmail: data.old_email ?? '',
      Provider: data.provider ?? '',
    };
    const blocks = copy.blocks.map((block) => {
      const filled: Record<string, unknown> = { ...block };
      for (const key of ['text', 'url', 'label', 'intro'] as const) {
        if (typeof filled[key] === 'string') filled[key] = fill(filled[key] as string, values);
      }
      return filled as typeof block;
    });
    const { html, text } = renderEmail({ language, title: copy.title, preheader: copy.preheader, blocks });
    return { from, to, subject: fill(copy.subject, values), html, text };
  };

  if (data.email_action_type === 'email_change') {
    // Supabase names these the other way round for old clients: the current address
    // gets token + token_hash_new, the new one gets token_new + token_hash.
    const messages: MailMessage[] = [];
    if (user.new_email && data.token_hash && data.token_hash_new) {
      messages.push(compose(user.email, data.token_hash_new, data.token));
      messages.push(compose(user.new_email, data.token_hash, data.token_new));
    } else if (user.new_email) {
      messages.push(compose(user.new_email, data.token_hash ?? data.token_hash_new, data.token ?? data.token_new));
    }
    return messages;
  }
  return [compose(user.email, data.token_hash, data.token)];
}

export interface HookReply {
  status: number;
  body: Record<string, unknown>;
}

/** The whole hook: check it really comes from Supabase, then send, account emails first in line. */
export async function handleAuthHook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  send: (message: MailMessage) => Promise<{ ok: boolean; error?: string }>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<HookReply> {
  const secret = env.SEND_EMAIL_HOOK_SECRET ?? '';
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const from = env.MAIL_FROM || env.RESEND_FROM || '';
  if (!secret || !supabaseUrl || !from) return { status: 503, body: { error: { http_code: 503, message: 'Email hook is not configured' } } };
  if (!verifyHook(rawBody, headers, secret)) return { status: 401, body: { error: { http_code: 401, message: 'Invalid signature' } } };

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: { http_code: 400, message: 'Invalid payload' } } };
  }
  const messages = buildAuthEmails(payload, supabaseUrl, from);
  if (!messages.length) {
    console.error('[AUTH-EMAIL] Nothing to send for', payload?.email_data?.email_action_type);
    return { status: 200, body: {} };
  }
  for (const message of messages) {
    const result = await send(message);
    if (!result.ok) {
      console.error('[AUTH-EMAIL] Could not send:', result.error);
      return { status: 500, body: { error: { http_code: 500, message: 'The email could not be sent. Please try again in a moment.' } } };
    }
  }
  return { status: 200, body: {} };
}
