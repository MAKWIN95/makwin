// Photos are made ready for the web before uploading, so any photo can be
// published: far more detail than a screen shows is left out, and nothing else.
const MAX_SIDE = 2560;
const MAX_BYTES = 4 * 1024 * 1024;
const QUALITIES = [0.92, 0.86, 0.8, 0.72, 0.62];
const LEAVE_AS_IS_BYTES = 1024 * 1024;

export function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    image.src = url;
  });
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

// Throws only when the browser cannot open the file at all.
export async function prepareImage(file: File): Promise<File> {
  // Only iPhones' own format needs converting however small it is: other browsers cannot show it.
  const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!isHeic && file.size <= LEAVE_AS_IS_BYTES) return file;

  const image = await readImage(file);
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  if (!isHeic && longest <= MAX_SIDE && file.size <= MAX_BYTES) return file;

  const scale = Math.min(1, MAX_SIDE / longest);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob: Blob | null = null;
  for (const quality of QUALITIES) {
    blob = await toJpeg(canvas, quality);
    if (blob && blob.size <= MAX_BYTES) break;
  }
  if (!blob) throw new Error('could not compress image');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
}
