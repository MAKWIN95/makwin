import { Resend } from 'resend';
import { renderEmail, type EmailContent } from './email-layout.js';

export type SendEmailResult = { ok: true; id: string | null } | { ok: false; error: string };

interface SendEmailOptions {
  to: string;
  subject: string;
  content: EmailContent;
  replyTo?: string;
}

// Every email the API sends goes through here: Resend only, from RESEND_FROM only.
// It never throws, so a mail outage cannot undo work that is already saved.
export async function sendEmail({ to, subject, content, replyTo }: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.error('[EMAIL] RESEND_API_KEY or RESEND_FROM is not configured');
    return { ok: false, error: 'not_configured' };
  }

  try {
    const { html, text } = renderEmail(content);
    const { data, error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      console.error('[EMAIL] Resend rejected the email:', error.name, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error: any) {
    console.error('[EMAIL] Could not reach Resend:', error?.message || error);
    return { ok: false, error: 'send_failed' };
  }
}

export function teamEmail(): string {
  return process.env.HELP_EMAIL || '';
}

export function artistsEmail(): string {
  return process.env.ARTISTS_EMAIL || '';
}

export function requestBaseUrl(headers: Record<string, string | string[] | undefined>): string {
  const host = headers['x-forwarded-host'] || headers.host;
  const proto = headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : '';
}
