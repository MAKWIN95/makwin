import { describe, expect, it } from 'vitest';
import { cardTagFrom } from './analytics';

/*
 * PRINTED BUSINESS CARDS — these links are on paper and can never change:
 *   c1 (Gigante)    → https://makwin.art/?t=c1
 *   c2 (Mil sitios) → https://makwin.art/?t=c2
 * The home page must keep opening for them and keep reading the tag.
 */
describe('printed card QR links', () => {
  it('reads the two printed tags', () => {
    expect(cardTagFrom('?t=c1')).toBe('c1');
    expect(cardTagFrom('?t=c2')).toBe('c2');
  });

  it('still reads them if a phone or network adds more to the link', () => {
    expect(cardTagFrom('?t=c1&utm_source=qr')).toBe('c1');
    expect(cardTagFrom('?fbclid=abc&t=c2')).toBe('c2');
  });

  it('ignores anything that is not a short lowercase tag', () => {
    expect(cardTagFrom('')).toBeNull();
    expect(cardTagFrom('?t=')).toBeNull();
    expect(cardTagFrom('?t=<script>')).toBeNull();
    expect(cardTagFrom('?t=' + 'a'.repeat(25))).toBeNull();
  });
});
