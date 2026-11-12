import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildAuthEmails, handleAuthHook, verifyHook, type HookPayload } from './auth-email.js';

const secretBytes = randomBytes(32);
const secret = `v1,whsec_${secretBytes.toString('base64')}`;
const SUPABASE = 'https://project.supabase.co';
const FROM = 'MAKWIN <no-reply@makwin.art>';

function sign(body: string, at = Math.floor(Date.now() / 1000)) {
  const id = 'msg_test';
  const signature = createHmac('sha256', secretBytes).update(`${id}.${at}.${body}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(at), 'webhook-signature': `v1,${signature}` };
}

const recovery: HookPayload = {
  user: { email: 'ana@example.com', user_metadata: { language_preference: 'es' } },
  email_data: { email_action_type: 'recovery', token: '123456', token_hash: 'abc&def', redirect_to: 'https://makwin.art/reset?x=1&y=2' },
};

describe('account emails through our own hook', () => {
  it('only accepts a fresh body signed with the secret', () => {
    const body = JSON.stringify(recovery);
    expect(verifyHook(body, sign(body), secret)).toBe(true);
    expect(verifyHook(body + ' ', sign(body), secret)).toBe(false);
    expect(verifyHook(body, sign(body, Math.floor(Date.now() / 1000) - 3600), secret)).toBe(false);
    expect(verifyHook(body, sign(body), `v1,whsec_${randomBytes(32).toString('base64')}`)).toBe(false);
  });

  it('writes the reset email in Spanish with a working link', () => {
    const [mail] = buildAuthEmails(recovery, SUPABASE, FROM);
    expect(mail.to).toBe('ana@example.com');
    expect(mail.subject).toBe('Restablece tu contraseña de MAKWIN');
    const link = `${SUPABASE}/auth/v1/verify?token=abc%26def&type=recovery&redirect_to=https%3A%2F%2Fmakwin.art%2Freset%3Fx%3D1%26y%3D2`;
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(link.replace(/&/g, '&amp;'));
    expect(mail.html).not.toContain('{{');
  });

  it('speaks English to someone who chose it', () => {
    const [mail] = buildAuthEmails({ ...recovery, user: { ...recovery.user, user_metadata: { language_preference: 'en' } } }, SUPABASE, FROM);
    expect(mail.subject).toBe('Reset your MAKWIN password');
  });

  it('sends a secure email change to both addresses with the right tokens', () => {
    const mails = buildAuthEmails({
      user: { email: 'old@example.com', new_email: 'new@example.com' },
      email_data: { email_action_type: 'email_change', token: '111', token_hash: 'for-new', token_new: '222', token_hash_new: 'for-old' },
    }, SUPABASE, FROM);
    expect(mails.map((m) => m.to)).toEqual(['old@example.com', 'new@example.com']);
    expect(mails[0].text).toContain('token=for-old');
    expect(mails[1].text).toContain('token=for-new');
    expect(mails[0].text).toContain('old@example.com');
    expect(mails[0].text).toContain('new@example.com');
  });

  it('puts the code in the re-authentication email', () => {
    const [mail] = buildAuthEmails({ user: { email: 'a@example.com' }, email_data: { email_action_type: 'reauthentication', token: '987654' } }, SUPABASE, FROM);
    expect(mail.text).toContain('987654');
  });

  it('answers Supabase: 200 when sent, 500 when it could not, 401 when unsigned, 503 when not set up', async () => {
    const body = JSON.stringify(recovery);
    const env = { SEND_EMAIL_HOOK_SECRET: secret, SUPABASE_URL: SUPABASE, MAIL_FROM: FROM } as any;
    const sent: string[] = [];
    expect((await handleAuthHook(body, sign(body), async (m) => { sent.push(m.to); return { ok: true }; }, env)).status).toBe(200);
    expect(sent).toEqual(['ana@example.com']);
    expect((await handleAuthHook(body, sign(body), async () => ({ ok: false, error: 'full' }), env)).status).toBe(500);
    expect((await handleAuthHook(body, {}, async () => ({ ok: true }), env)).status).toBe(401);
    expect((await handleAuthHook(body, sign(body), async () => ({ ok: true }), {} as any)).status).toBe(503);
  });
});
