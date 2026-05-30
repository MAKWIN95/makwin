import { useEffect, useState } from 'react';

interface Props {
  label: string;
  imageSrc?: string | null;
}

export default function WorkTypeBadge({ label, imageSrc }: Props) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    if (!imageSrc) {
      setIsDark(false);
      return;
    }

    let cancelled = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      if (cancelled) return;
      try {
        const w = Math.min(100, img.naturalWidth);
        const h = Math.min(100, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsDark(false);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h).data;
        // sample every Nth pixel to reduce work
        let total = 0;
        let count = 0;
        const step = 4 * 4; // sample every 4th pixel (RGBA)
        for (let i = 0; i < imgData.length; i += step) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          // luminance approx
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          total += lum;
          count++;
        }
        const avg = total / Math.max(1, count);
        // threshold 128 (0-255) -> dark if avg < 140 (slightly lenient)
        setIsDark(avg < 140);
      } catch (e) {
        // CORS or other canvas error: fallback to dark=false
        setIsDark(false);
      }
    };
    img.onerror = () => {
      if (!cancelled) setIsDark(false);
    };

    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  const textClass = isDark === null ? 'text-[hsl(var(--muted-foreground))]' : isDark ? 'text-white/90' : 'text-[hsl(var(--foreground))]';

  return (
    <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none ${textClass} text-xs font-semibold`}>
      {label}
    </div>
  );
}
