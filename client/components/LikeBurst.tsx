import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

// The heart that answers a double tap. Pass a number that goes up with each like.
export default function LikeBurst({ count, className }: { count: number; className?: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (count > 0) setShown(count);
  }, [count]);

  if (!shown) return null;

  return (
    <div className={cn('pointer-events-none inset-0 z-20 flex items-center justify-center', className)} aria-hidden="true">
      <Heart key={shown} onAnimationEnd={() => setShown(0)} className="like-burst w-16 h-16 fill-white stroke-white" />
    </div>
  );
}
