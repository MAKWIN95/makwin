import { readImage } from '@/lib/compress-image';

// All the photos of a work share one shape. The screen shows it with CSS and this
// paints the same thing into the file that gets uploaded, using the same numbers.
export const RATIOS = [
  { id: 'original', label: 'Original', value: 0 },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:5', label: '4:5', value: 4 / 5 },
  { id: '3:4', label: '3:4', value: 3 / 4 },
  { id: '9:16', label: '9:16', value: 9 / 16 },
  { id: '4:3', label: '4:3', value: 4 / 3 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
] as const;

export type RatioId = (typeof RATIOS)[number]['id'];
export type PhotoFit = 'contain' | 'cover';

export interface FrameStyle {
  ratio: RatioId;
  fit: PhotoFit;
  /** 'blur' uses the photo's own colours; anything else is a CSS colour. */
  border: string;
}

/** x and y go from -1 to 1 across the room the photo has to move. */
export interface PhotoEdit {
  zoom: number;
  x: number;
  y: number;
}

export interface PhotoSize {
  width: number;
  height: number;
}

export const NO_EDIT: PhotoEdit = { zoom: 1, x: 0, y: 0 };
export const DEFAULT_FRAME: FrameStyle = { ratio: 'original', fit: 'contain', border: 'blur' };

const LONG_SIDE = 2160;
const MAX_BYTES = 4 * 1024 * 1024;
const QUALITIES = [0.92, 0.86, 0.8, 0.72];
const SAME_SHAPE = 0.005;

export function frameRatio(style: FrameStyle, first: PhotoSize): number {
  return RATIOS.find((ratio) => ratio.id === style.ratio)?.value || first.width / first.height;
}

export function placePhoto(photo: PhotoSize, frameW: number, frameH: number, fit: PhotoFit, edit: PhotoEdit) {
  const pick = fit === 'cover' ? Math.max : Math.min;
  const scale = pick(frameW / photo.width, frameH / photo.height) * edit.zoom;
  const w = photo.width * scale;
  const h = photo.height * scale;
  const roomX = Math.abs(w - frameW) / 2;
  const roomY = Math.abs(h - frameH) / 2;
  return { x: (frameW - w) / 2 + edit.x * roomX, y: (frameH - h) / 2 + edit.y * roomY, w, h, roomX, roomY };
}

// Untouched photos that already have the right shape keep their own file.
export function needsFraming(photo: PhotoSize, ratio: number, edit: PhotoEdit): boolean {
  const sameShape = Math.abs(photo.width / photo.height - ratio) / ratio < SAME_SHAPE;
  return !sameShape || edit.zoom !== 1 || edit.x !== 0 || edit.y !== 0;
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

// Safari cannot blur on a canvas: shrinking a lot and growing back in steps gives
// the same soft wash of the photo's colours in every browser.
function paintBlur(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const shrink = 28 / Math.max(width, height);
  let source = canvasOf(width * shrink, height * shrink);
  const place = placePhoto({ width: image.naturalWidth, height: image.naturalHeight }, source.canvas.width, source.canvas.height, 'cover', NO_EDIT);
  source.context.drawImage(image, place.x, place.y, place.w, place.h);
  for (const grow of [4, 4]) {
    const bigger = canvasOf(source.canvas.width * grow, source.canvas.height * grow);
    bigger.context.drawImage(source.canvas, 0, 0, bigger.canvas.width, bigger.canvas.height);
    source = bigger;
  }
  context.drawImage(source.canvas, 0, 0, width, height);
}

export async function framePhoto(file: File, ratio: number, style: FrameStyle, edit: PhotoEdit): Promise<File> {
  const image = await readImage(file);
  const width = ratio >= 1 ? LONG_SIDE : LONG_SIDE * ratio;
  const height = ratio >= 1 ? LONG_SIDE / ratio : LONG_SIDE;
  const { canvas, context } = canvasOf(width, height);

  if (style.border === 'blur') paintBlur(context, image, canvas.width, canvas.height);
  else {
    context.fillStyle = style.border;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const place = placePhoto({ width: image.naturalWidth, height: image.naturalHeight }, canvas.width, canvas.height, style.fit, edit);
  context.drawImage(image, place.x, place.y, place.w, place.h);

  let blob: Blob | null = null;
  for (const quality of QUALITIES) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob) throw new Error('could not paint the photo');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-framed.jpg`, { type: 'image/jpeg' });
}
