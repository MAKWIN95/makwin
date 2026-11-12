import { readImage } from './compress-image';
import { supabase } from './supabase';
import { isPhotoPath, smallPathOf } from '@shared/photo-paths';

// Every published photo also goes up as a light copy, for the places that show it
// small (feed, grids, notifications). The full one is only fetched when a work is
// opened: the feed downloads about a tenth as much and still looks sharp on a phone.

/** The light copy fits inside this box: sharp in a two-column phone grid at 3x. */
const SMALL_WIDTH = 720;
const SMALL_HEIGHT = 1440;
const SMALL_QUALITY = 0.82;
/** A year: every file has its own name, so a cached copy never goes stale. */
export const CACHE_FOR_A_YEAR = '31536000';

const WORKS_FOLDER = '/storage/v1/object/public/works/';

export { isPhotoPath, smallPathOf };

/** The light copy of a published photo; anything else comes back as it is. */
export function smallUrl(url: string): string;
export function smallUrl(url: string | null | undefined): string | null | undefined;
export function smallUrl(url: string | null | undefined) {
  if (!url) return url;
  const [base, query] = url.split('?');
  if (!base.includes(WORKS_FOLDER) || !isPhotoPath(base)) return url;
  return smallPathOf(base) + (query ? `?${query}` : '');
}

/** If a light copy is missing, the picture quietly falls back to the full one. */
export function fullOnError(full: string | null | undefined) {
  return (event: { currentTarget: HTMLImageElement }) => {
    const image = event.currentTarget;
    if (full && image.getAttribute('src') !== full) image.src = full;
  };
}

/** The light copy and its fallback, ready to spread on an <img>. */
export function smallImage(full: string | null | undefined) {
  return { src: smallUrl(full) ?? undefined, onError: fullOnError(full) };
}

// Halving step by step keeps fine lines (hair, strings, text) crisp where one big jump would shimmer.
function shrink(source: CanvasImageSource, width: number, height: number, toWidth: number, toHeight: number): HTMLCanvasElement {
  let canvas = document.createElement('canvas');
  let w = width;
  let h = height;
  let from: CanvasImageSource = source;
  while (w / 2 >= toWidth && h / 2 >= toHeight) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    canvas = draw(from, w, h);
    from = canvas;
  }
  return draw(from, toWidth, toHeight);
}

function draw(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no canvas');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** A light copy of the photo, never larger than the original. A PNG stays PNG so see-through art keeps its transparency. */
export async function makeSmallPhoto(file: File, box = { width: SMALL_WIDTH, height: SMALL_HEIGHT }): Promise<Blob> {
  const image = await readImage(file);
  const { naturalWidth: width, naturalHeight: height } = image;
  const scale = Math.min(1, box.width / width, box.height / height);
  const canvas = shrink(image, width, height, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, SMALL_QUALITY));
  if (!blob) throw new Error('could not make the light copy');
  return blob.size < file.size ? blob : file;
}

/**
 * Puts the light copy next to a photo that is going up. It never stops a publish:
 * without it, the feed simply shows the full photo.
 */
export async function uploadSmallCopy(file: File, path: string): Promise<void> {
  if (!file.type.startsWith('image/') || !isPhotoPath(path)) return;
  try {
    const small = await makeSmallPhoto(file);
    const { error } = await supabase.storage.from('works').upload(smallPathOf(path), small, {
      upsert: true,
      cacheControl: CACHE_FOR_A_YEAR,
      contentType: small.type || 'image/jpeg',
    });
    if (error) console.warn('[small-photo] The light copy did not go up:', error.message);
  } catch (err) {
    console.warn('[small-photo] Could not make the light copy:', err);
  }
}
