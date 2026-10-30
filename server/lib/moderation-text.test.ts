import { describe, expect, it } from 'vitest';
import { findBlockedTerms } from './moderation-text.js';

describe('findBlockedTerms', () => {
  it('lets ordinary artistic text through', () => {
    for (const text of [
      'Paisaje al atardecer con cono de luz sobre el mar',
      'Un poema sobre la casa de mi abuela y las pollitas del corral',
      'Before summer ends, a song about leaving home',
      'Óleo sobre lienzo, técnica mixta. Inspirado en Picasso.',
      'Te acompañaré hasta que amanezca',
      'La assassin creed class on the classic Scunthorpe road',
    ]) {
      expect(findBlockedTerms(text), text).toEqual([]);
    }
  });

  it('catches Spanish terms with accents, capitals and tricks', () => {
    expect(findBlockedTerms('Vídeo PORNOGRAFÍA gratis')).not.toEqual([]);
    expect(findBlockedTerms('p0rno gratis')).not.toEqual([]);
    expect(findBlockedTerms('pooorno')).not.toEqual([]);
    expect(findBlockedTerms('Enseño el coño')).not.toEqual([]);
    expect(findBlockedTerms('heil  hitler')).not.toEqual([]);
  });

  it('catches English terms', () => {
    expect(findBlockedTerms('free porn here')).not.toEqual([]);
    expect(findBlockedTerms('kill yourself')).not.toEqual([]);
  });

  it('handles empty text', () => {
    expect(findBlockedTerms('')).toEqual([]);
  });
});
