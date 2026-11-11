import { forwardRef, type ImgHTMLAttributes } from 'react';
import { useSharpSrc } from '@/hooks/use-sharp-src';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & { src: string };

/** A full-size photo that shows its light copy first and sharpens as soon as the full one is ready. */
export const SharpImage = forwardRef<HTMLImageElement, Props>(function SharpImage({ src: full, ...rest }, ref) {
  const { src, onError } = useSharpSrc(full);
  return <img ref={ref} src={src} onError={onError} {...rest} />;
});
