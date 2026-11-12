export const DEFAULT_POEM_FONT = 'clasica';

export const POEM_FONTS = [
  { id: 'clasica', es: 'Clásica', en: 'Classic', family: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', scale: 1, load: null },
  { id: 'elegante', es: 'Elegante', en: 'Elegant', family: '"Cormorant Garamond", Georgia, serif', scale: 1.12, load: () => Promise.all([import('@fontsource/cormorant-garamond/400.css'), import('@fontsource/cormorant-garamond/500.css')]) },
  { id: 'moderna', es: 'Moderna', en: 'Modern', family: 'Inter, system-ui, sans-serif', scale: 0.95, load: null },
  { id: 'maquina', es: 'Máquina', en: 'Typewriter', family: '"Courier Prime", "Courier New", monospace', scale: 0.95, load: () => import('@fontsource/courier-prime/400.css') },
  { id: 'manuscrita', es: 'Manuscrita', en: 'Handwritten', family: 'Caveat, "Segoe Script", cursive', scale: 1.3, load: () => Promise.all([import('@fontsource/caveat/400.css'), import('@fontsource/caveat/500.css')]) },
] as const;

export type PoemFontId = (typeof POEM_FONTS)[number]['id'];

export function poemFont(id?: string | null) {
  return POEM_FONTS.find((font) => font.id === id) ?? POEM_FONTS[0];
}

// Downloaded only when a poem needs them, so no other page pays for them. They are
// served from MAKWIN itself, never from Google.
const requested = new Set<string>();

export function loadPoemFont(id?: string | null) {
  const font = poemFont(id);
  if (!font.load || requested.has(font.id)) return;
  requested.add(font.id);
  font.load().catch(() => requested.delete(font.id));
}

// Each typeface looks a different size at the same number, so they all get evened out.
export function poemFontStyle(id: string | null | undefined, baseRem: number) {
  const font = poemFont(id);
  return { fontFamily: font.family, fontSize: `${baseRem * font.scale}rem` };
}
