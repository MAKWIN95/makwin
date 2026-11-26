import { describe, expect, it } from 'vitest';
import { cardTagFrom } from './analytics';

describe('cardTagFrom', () => {
  it('reads the card design from a QR link', () => {
    expect(cardTagFrom('?t=gigante')).toBe('gigante');
    expect(cardTagFrom('?x=1&t=solo-m')).toBe('solo-m');
  });
  it('ignores missing, empty or odd values', () => {
    expect(cardTagFrom('')).toBeNull();
    expect(cardTagFrom('?t=')).toBeNull();
    expect(cardTagFrom('?t=Gigante')).toBeNull();
    expect(cardTagFrom('?t=<script>')).toBeNull();
    expect(cardTagFrom('?t=' + 'a'.repeat(25))).toBeNull();
  });
});
