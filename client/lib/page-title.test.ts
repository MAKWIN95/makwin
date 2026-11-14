import { describe, expect, it } from 'vitest';
import { titleForPath } from './page-title';

describe('page titles', () => {
  it('names fixed pages in the visitor language', () => {
    expect(titleForPath('/', 'es')).toBe('MAKWIN · La red social para artistas');
    expect(titleForPath('/login', 'es')).toBe('Iniciar sesión · MAKWIN');
    expect(titleForPath('/login/', 'en')).toBe('Sign in · MAKWIN');
  });

  it('leaves works, profiles, beats and legal texts to name themselves', () => {
    for (const path of ['/work/1', '/u/ana', '/beats', '/privacidad']) expect(titleForPath(path, 'es', ['/privacidad'])).toBeUndefined();
  });

  it('calls anything else a missing page', () => {
    expect(titleForPath('/nada', 'es')).toBe('Página no encontrada · MAKWIN');
  });
});
