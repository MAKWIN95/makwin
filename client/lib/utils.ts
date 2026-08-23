import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize hashtags input into an array of lowercase tags without leading # and duplicates */
export function normalizeHashtags(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  const normalizeToken = (s: string) => s.replace(/^#/, '').trim().toLowerCase();
  if (Array.isArray(input)) {
    const tokens = input.flatMap(i => String(i).split(/[,\s]+/));
    return Array.from(new Set(tokens.map(normalizeToken).filter(Boolean)));
  }
  const replaced = String(input).replace(/,/g, ' ');
  const tokens = replaced.split(/\s+/);
  return Array.from(new Set(tokens.map(normalizeToken).filter(Boolean)));
}

/** Format a hashtags array for display in a single-line input (adds leading # and space-separated) */
export function formatHashtagsForInput(input: string[] | string | undefined | null): string {
  if (!input) return '';
  if (Array.isArray(input)) return input.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' ');
  // if it's a string, try to normalize then format
  const arr = normalizeHashtags(input);
  return arr.map(t => `#${t}`).join(' ');
}
