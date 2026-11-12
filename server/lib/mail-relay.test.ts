import { describe, expect, it } from 'vitest';
import { configuredProviders, flushQueue, memoryBook, relay, type MailMessage, type MailProvider } from './mail-relay.js';

const message: MailMessage = { from: 'MAKWIN <no-reply@makwin.art>', to: 'test@example.com', subject: 'Hola', html: '<p>Hola</p>', text: 'Hola' };

function fake(name: string, daily: number, behaviour: 'ok' | 'down' = 'ok') {
  const sent: MailMessage[] = [];
  const provider: MailProvider = {
    name,
    daily,
    async send(m) {
      if (behaviour === 'down') throw new Error(`${name} down`);
      sent.push(m);
      return { id: `${name}-${sent.length}` };
    },
  };
  return { provider, sent };
}

describe('mail relay', () => {
  it('uses the first service until its day is full, then the next', async () => {
    const book = memoryBook();
    const a = fake('a', 2);
    const b = fake('b', 10);
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await relay(message, 'urgent', { providers: [a.provider, b.provider], book }));
    expect(results.map((r) => ('provider' in r ? r.provider : 'queued'))).toEqual(['a', 'a', 'b']);
  });

  it('moves on when a service is down', async () => {
    const down = fake('down', 100, 'down');
    const ok = fake('ok', 100);
    const result = await relay(message, 'urgent', { providers: [down.provider, ok.provider], book: memoryBook() });
    expect(result).toMatchObject({ ok: true, provider: 'ok' });
  });

  it('keeps a quarter of the day for account emails: ordinary ones wait', async () => {
    const book = memoryBook();
    const a = fake('a', 4);
    for (let i = 0; i < 3; i++) await relay(message, 'urgent', { providers: [a.provider], book });
    expect(await relay(message, 'normal', { providers: [a.provider], book })).toEqual({ ok: true, queued: true });
    expect(await relay(message, 'urgent', { providers: [a.provider], book })).toMatchObject({ ok: true, provider: 'a' });
  });

  it('sends what waited when there is room again', async () => {
    const book = memoryBook();
    await book.enqueue({ message, at: 1 });
    await book.enqueue({ message: { ...message, to: 'second@example.com' }, at: 2 });
    const a = fake('a', 100);
    expect(await flushQueue({ providers: [a.provider], book })).toEqual({ sent: 2, waiting: 0 });
    expect(a.sent.map((m) => m.to)).toEqual(['test@example.com', 'second@example.com']);
  });

  it('an ordinary email that goes out takes a few waiting ones with it', async () => {
    const book = memoryBook();
    for (let i = 0; i < 5; i++) await book.enqueue({ message: { ...message, to: `w${i}@example.com` }, at: i });
    const a = fake('a', 100);
    await relay(message, 'normal', { providers: [a.provider], book });
    expect(a.sent.map((m) => m.to)).toEqual(['test@example.com', 'w0@example.com', 'w1@example.com', 'w2@example.com']);
  });

  it('with no service configured it says so instead of pretending', async () => {
    expect(await relay(message, 'urgent', { providers: [], book: memoryBook() })).toEqual({ ok: false, error: 'not_configured' });
  });

  it('lines services up from the environment in order: Brevo, Mailjet, Resend', () => {
    expect(configuredProviders({ BREVO_API_KEY: 'x', MAILJET_API_KEY: 'y', MAILJET_SECRET_KEY: 'z', RESEND_API_KEY: 'w' } as any).map((p) => [p.name, p.daily])).toEqual([['brevo', 300], ['mailjet', 200], ['resend', 100]]);
    expect(configuredProviders({ RESEND_API_KEY: '' } as any)).toEqual([]);
  });
});
