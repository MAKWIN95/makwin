// Where a photo's light copy lives: next to it, with the same name and `.sm.jpg` at the end.
// Shared so that the page that makes it and the server that removes it always agree.
const SMALL_TAIL = '.sm.jpg';
const PHOTO_FILE = /\.(jpe?g|png|webp|heic|heif)$/i;

export function isPhotoPath(path: string): boolean {
  return PHOTO_FILE.test(path) && !path.endsWith(SMALL_TAIL);
}

export function smallPathOf(path: string): string {
  return path.replace(/\.[a-z0-9]+$/i, '') + SMALL_TAIL;
}

/** The files to remove for these paths: each one and, for a photo, its light copy too. */
export function withSmallCopies(paths: string[]): string[] {
  return paths.flatMap((path) => (isPhotoPath(path) ? [path, smallPathOf(path)] : [path]));
}
