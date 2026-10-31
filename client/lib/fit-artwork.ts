// A work fills the room it has, however few pixels its file happens to have.
const ROOM_HEIGHT = '80vh';

function fit(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight) return;
  image.style.width = `min(100%, calc(${ROOM_HEIGHT} * ${image.naturalWidth / image.naturalHeight}))`;
}

export function fitArtwork(image: HTMLImageElement | null) {
  if (!image) return;
  image.addEventListener('load', () => fit(image));
  fit(image);
}
