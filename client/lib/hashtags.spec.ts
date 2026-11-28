import { describe, expect, it } from 'vitest';
import { splitHashtags } from './utils';

describe('hashtags escritos en la descripción', () => {
  it('salen como etiquetas y el texto se queda con las palabras', () => {
    expect(splitHashtags('Óleo sobre lino, pintado en invierno. #retrato #Óleo')).toEqual({ text: 'Óleo sobre lino, pintado en invierno.', tags: ['retrato', 'óleo'] });
  });
  it('también en medio de una frase y en otra línea', () => {
    expect(splitHashtags('Mi abuela #retrato en su cocina.\n\n#familia #luz')).toEqual({ text: 'Mi abuela en su cocina.', tags: ['retrato', 'familia', 'luz'] });
  });
  it('no confunde un # pegado a una palabra ni repite etiquetas', () => {
    expect(splitHashtags('Sonata en C# menor #musica #musica')).toEqual({ text: 'Sonata en C# menor', tags: ['musica'] });
  });
  it('sin hashtags no cambia nada', () => {
    expect(splitHashtags('Solo texto.')).toEqual({ text: 'Solo texto.', tags: [] });
  });
});
