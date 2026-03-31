import { useEffect, useState } from 'react';
import { Music, Image as Img, Camera, Video, FileText, Pen, File } from 'lucide-react';

interface Props {
  workType: string;
  imageSrc?: string | null;
  forceThemeColor?: boolean; // if true, use page theme instead of sampling image
}

const iconMap: Record<string, any> = {
  musica: Music,
  música: Music,
  cancion: Music,
  canción: Music,
  fotografia: Img,
  fotografía: Img,
  foto: Camera,
  video: Video,
  poesia: FileText,
  poesía: FileText,
  poema: FileText,
  texto: FileText,
  pintura: Pen,
};

export default function WorkTypeIcon({ workType, imageSrc, forceThemeColor }: Props) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    if (forceThemeColor) {
      // Decide based on page theme. Prefer explicit DOM class or saved localStorage value
      const getIsDarkTheme = () => {
        if (typeof document === 'undefined') return false;
        const root = document.documentElement;
        if (root.classList.contains('dark')) return true;
        try {
          const stored = localStorage.getItem('theme');
          if (stored === 'dark') return true;
          if (stored === 'light') return false;
        } catch (e) {}
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      };
      setIsDark(getIsDarkTheme());

      // Observe changes to documentElement class (theme toggles) so icon updates live
      let mo: MutationObserver | null = null;
      try {
        mo = new MutationObserver(() => {
          setIsDark(getIsDarkTheme());
        });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      } catch (e) {
        // ignore
      }

      // Listen to prefers-color-scheme changes
      const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
      const mqlHandler = () => setIsDark(getIsDarkTheme());
      if (mql && mql.addEventListener) mql.addEventListener('change', mqlHandler);
      else if (mql && mql.addListener) mql.addListener(mqlHandler);

      // Listen to storage events (in case theme toggles in another tab)
      const storageHandler = (e: StorageEvent) => {
        if (e.key === 'theme') setIsDark(getIsDarkTheme());
      };
      window.addEventListener('storage', storageHandler);

      return () => {
        if (mo) mo.disconnect();
        if (mql && mql.removeEventListener) mql.removeEventListener('change', mqlHandler);
        else if (mql && mql.removeListener) mql.removeListener(mqlHandler);
        window.removeEventListener('storage', storageHandler);
      };
    }

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
        const w = img.naturalWidth || 100;
        const h = img.naturalHeight || 100;
        // sample a small region in bottom-right corner
        const sampleSize = Math.max(8, Math.min(60, Math.floor(Math.min(w, h) / 6)));
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsDark(false);
          return;
        }
        // draw the bottom-right portion scaled into the sample canvas
        ctx.drawImage(img, Math.max(0, w - sampleSize), Math.max(0, h - sampleSize), sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
        const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
        let total = 0;
        let count = 0;
        const step = 4 * 3; // sample every 3rd pixel
        for (let i = 0; i < data.length; i += step) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          total += lum;
          count++;
        }
        const avg = total / Math.max(1, count);
        setIsDark(avg < 140);
      } catch (e) {
        setIsDark(false);
      }
    };
    img.onerror = () => {
      if (!cancelled) setIsDark(false);
    };

    return () => {
      cancelled = true;
    };
  }, [imageSrc, forceThemeColor]);

  const key = workType?.toLowerCase() || '';
  const Icon = iconMap[key] || File;
  const color = isDark === null ? 'currentColor' : isDark ? 'rgba(255,255,255,0.92)' : 'rgba(15,15,15,0.92)';

  const borderClass = isDark === null ? 'border-white/20' : isDark ? 'border-white/20' : 'border-black/20';

  return (
    <div className={`absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm bg-white/20 border ${borderClass}`}>
      <Icon size={16} strokeWidth={1.5} color={color} />
    </div>
  );
}
