import { useEffect, useState } from 'react';
import { smallUrl } from '@/lib/small-photo';

/**
 * A work opens with the light copy the feed already has, so it is there at once and can
 * fly to its place; the full photo loads behind it and takes over once it is decoded,
 * the same picture, only sharper. A missing light copy goes straight to the full one.
 */
export function useSharpSrc(full: string) {
  const light = smallUrl(full);
  const [src, setSrc] = useState(light);

  useEffect(() => {
    setSrc(light);
    if (light === full) return;
    let cancelled = false;
    const image = new Image();
    image.src = full;
    image.decode()
      .catch(() => undefined)
      .then(() => {
        if (!cancelled && image.naturalWidth) setSrc(full);
      });
    return () => {
      cancelled = true;
    };
  }, [full, light]);

  const onError = () => setSrc(full);
  return { src, onError };
}
