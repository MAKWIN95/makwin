import { renderEmail, type EmailContent } from './email-layout.js';
import { relay, type Priority } from './mail-relay.js';

export type SendEmailResult = { ok: true; id: string | null } | { ok: false; error: string };

interface SendEmailOptions {
  to: string;
  subject: string;
  content: EmailContent;
  replyTo?: string;
  from?: string;
  /** Account emails are urgent; everything else may wait for room on a very busy day. */
  priority?: Priority;
}

// The address people write to and that answers them from the admin panel.
export const HELP_ADDRESS = 'help@makwin.art';
export const HELP_SENDER = `MAKWIN <${HELP_ADDRESS}>`;

// Every email the API sends goes through here, from MAIL_FROM (or RESEND_FROM) unless
// a caller answers as the help desk. The relay spreads them over the free mail services.
// It never throws, so a mail outage cannot undo work that is already saved.
export async function sendEmail({ to, subject, content, replyTo, from: sender, priority = 'normal' }: SendEmailOptions): Promise<SendEmailResult> {
  const from = sender || process.env.MAIL_FROM || process.env.RESEND_FROM;
  if (!from) {
    console.error('[EMAIL] MAIL_FROM is not configured');
    return { ok: false, error: 'not_configured' };
  }
  try {
    const { html, text } = renderEmail(content);
    const result = await relay({ from, to, subject, html, text, replyTo }, priority);
    if ('error' in result) return { ok: false, error: result.error };
    return { ok: true, id: 'queued' in result ? null : result.id };
  } catch (error: any) {
    console.error('[EMAIL] Could not send:', error?.message || error);
    return { ok: false, error: 'send_failed' };
  }
}

export function artistsEmail(): string {
  return process.env.ARTISTS_EMAIL || '';
}

export function requestBaseUrl(headers: Record<string, string | string[] | undefined>): string {
  const host = headers['x-forwarded-host'] || headers.host;
  const proto = headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : '';
}
