import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

// Text filter for titles, descriptions, lyrics and tags. A match never deletes
// anything: it only sends the work to the admin panel for a human decision.
const english = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

// Written like normalizeText leaves them: lowercase, no accents, "ñ" kept.
const SPANISH_AND_EXTRA_TERMS = [
  // Sexual
  'porno', 'pornografia', 'pornografica', 'pornografico', 'xxx', 'follar', 'follando', 'follame', 'polla', 'pollas',
  'coño', 'tetas', 'mamada', 'mamadas', 'masturbar', 'masturbacion', 'masturbandose', 'felacion', 'orgia', 'orgias',
  'puta', 'putas', 'puto', 'putos', 'zorra', 'zorras', 'desnudos integrales', 'onlyfans', 'sexo explicito', 'nudes',
  // Minors
  'pedofilia', 'pedofilo', 'pedofila', 'pederasta', 'pedophile', 'pedophilia', 'child porn', 'loli', 'lolicon', 'shota',
  // Hate
  'nazi', 'nazis', 'heil hitler', 'maricon', 'maricones', 'negrata', 'negratas', 'sudaca', 'sudacas', 'moro de mierda',
  // Violence and self-harm
  'gore', 'snuff', 'decapitacion', 'decapitar', 'descuartizar', 'descuartizado', 'beheading', 'dismembered',
  'matate', 'suicidate', 'kill yourself',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

export function normalizeText(text: string): string {
  // "ñ" is a different letter, not an accent: "coño" must never read as "cono" (cone).
  return text
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (char) => LEET[char])
    .replace(/\u0001/g, 'ñ');
}

// Every letter may repeat ("pooorno") and multi-word terms allow any spacing.
const SPANISH_PATTERN = new RegExp(
  `(?<![a-z])(?:${SPANISH_AND_EXTRA_TERMS.map((term) =>
    term
      .split(' ')
      .map((word) => word.split('').map((letter) => `${letter}+`).join(''))
      .join('[\\s._-]+'),
  ).join('|')})(?![a-z])`,
  'g',
);

// Returns the words that matched, so the admin can see why a work was held.
export function findBlockedTerms(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of normalizeText(text).matchAll(SPANISH_PATTERN)) {
    found.add(match[0].replace(/\s+/g, ' '));
  }
  for (const match of english.getAllMatches(text)) {
    const { phraseMetadata } = englishDataset.getPayloadWithPhraseMetadata(match);
    found.add(phraseMetadata?.originalWord ?? 'english');
  }
  return [...found];
}
