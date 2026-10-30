export const DEFAULT_POEM_FONT = 'clasica';

export const POEM_FONTS = [
  { id: 'clasica', es: 'Clásica', en: 'Classic', family: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', scale: 1, google: null },
  { id: 'elegante', es: 'Elegante', en: 'Elegant', family: '"Cormorant Garamond", Georgia, serif', scale: 1.12, google: 'Cormorant+Garamond:wght@400;500' },
  { id: 'moderna', es: 'Moderna', en: 'Modern', family: 'Inter, system-ui, sans-serif', scale: 0.95, google: null },
  { id: 'maquina', es: 'Máquina', en: 'Typewriter', family: '"Courier Prime", "Courier New", monospace', scale: 0.95, google: 'Courier+Prime' },
  { id: 'manuscrita', es: 'Manuscrita', en: 'Handwritten', family: 'Caveat, "Segoe Script", cursive', scale: 1.3, google: 'Caveat:wght@400;500' },
] as const;

export type PoemFontId = (typeof POEM_FONTS)[number]['id'];

export function poemFont(id?: string | null) {
  return POEM_FONTS.find((font) => font.id === id) ?? POEM_FONTS[0];
}

// Downloaded only when a poem needs them, so no other page pays for them.
const requested = new Set<string>();

export function loadPoemFont(id?: string | null) {
  const { google } = poemFont(id);
  if (!google || requested.has(google)) return;
  requested.add(google);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${google}&display=swap`;
  document.head.appendChild(link);
}

// Each typeface looks a different size at the same number, so they all get evened out.
export function poemFontStyle(id: string | null | undefined, baseRem: number) {
  const font = poemFont(id);
  return { fontFamily: font.family, fontSize: `${baseRem * font.scale}rem` };
}
