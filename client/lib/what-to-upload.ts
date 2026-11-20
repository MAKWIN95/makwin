// What belongs on MAKWIN and what does not. The window before uploading and the
// rules page say the same thing in the same words, so nobody reads two versions.

export interface WhatToUpload {
  title: string;
  test: string;
  yesTitle: string;
  yes: string[];
  noTitle: string;
  no: string[];
  carousel: string;
  nuance: string;
  ok: string;
}

export const WHAT_TO_UPLOAD: Record<'es' | 'en', WhatToUpload> = {
  es: {
    title: 'MAKWIN es para obras',
    test: 'Sube lo que colgarías en una exposición o pondrías en tu portfolio.',
    yesTitle: 'Sí',
    yes: ['Una obra o una serie', 'El proceso de una obra', 'Los detalles de una pieza'],
    noTitle: 'Mejor en otra red',
    no: ['Selfis y fotos del día a día', 'Viajes, fiestas y bodas', 'Memes y capturas de pantalla'],
    carousel: 'En un carrusel, todas las fotos son de la misma obra o serie.',
    nuance: 'Un autorretrato o una foto de un viaje sí pueden ser una obra, si los has hecho con intención artística.',
    ok: 'Entendido',
  },
  en: {
    title: 'MAKWIN is for artworks',
    test: 'Share what you would hang in an exhibition or put in your portfolio.',
    yesTitle: 'Yes',
    yes: ['An artwork or a series', 'The process behind a work', 'Close-ups of a piece'],
    noTitle: 'Better on another network',
    no: ['Selfies and everyday photos', 'Trips, parties and weddings', 'Memes and screenshots'],
    carousel: 'In a carousel, every photo belongs to the same work or series.',
    nuance: 'A self-portrait or a photo from a trip can be an artwork, if you made it with artistic intent.',
    ok: 'Got it',
  },
};
