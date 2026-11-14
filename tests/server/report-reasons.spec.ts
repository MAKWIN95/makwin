import { describe, expect, it } from 'vitest';
import { storedReport } from '../../api/reports';
import { requestBaseUrl } from '../../server/lib/email';

describe('storedReport', () => {
  it('keeps the old shapes the panel already reads', () => {
    expect(storedReport(['spam'], '')).toEqual({ reason: 'spam', details: null });
    expect(storedReport(['spam', 'acoso'], 'x')).toEqual({ reason: 'spam', details: '[acoso] x' });
    expect(storedReport(['ia'], '')).toEqual({ reason: 'otro', details: '[ia-only]' });
    expect(storedReport(['ia', 'spam'], '')).toEqual({ reason: 'spam', details: '[ia]' });
    expect(storedReport(['otro'], 'why')).toEqual({ reason: 'otro', details: 'why' });
  });

  it('stores a copy claim with its proof', () => {
    expect(storedReport(['copia'], 'https://example.com/mine')).toEqual({ reason: 'otro', details: '[copia-only] https://example.com/mine' });
    expect(storedReport(['copia', 'ia'], 'link')).toEqual({ reason: 'otro', details: '[copia+ia-only] link' });
    expect(storedReport(['porno', 'copia'], 'link')).toEqual({ reason: 'porno', details: '[copia] link' });
  });
});

describe('requestBaseUrl', () => {
  it('uses our own hosts as they came', () => {
    expect(requestBaseUrl({ host: 'www.makwin.art' })).toBe('https://www.makwin.art');
    expect(requestBaseUrl({ 'x-forwarded-host': 'makwin.art' })).toBe('https://makwin.art');
    expect(requestBaseUrl({ host: 'localhost:8080' })).toBe('http://localhost:8080');
  });

  it('never puts a stranger\'s address in an email', () => {
    expect(requestBaseUrl({ host: 'evil.example' })).toBe('https://www.makwin.art');
    expect(requestBaseUrl({ 'x-forwarded-host': 'evil.example', host: 'www.makwin.art' })).toBe('https://www.makwin.art');
    expect(requestBaseUrl({ host: 'makwin.vercel.app' })).toBe('https://www.makwin.art');
    expect(requestBaseUrl({})).toBe('https://www.makwin.art');
  });
});
