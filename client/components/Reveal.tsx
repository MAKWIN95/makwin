import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Something that comes and goes unfolds and folds away, pushing what is below gently.
export default function Reveal({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn('reveal', className)} data-open={open || undefined} aria-hidden={!open} {...(open ? {} : { inert: '' })}>
      <div className="reveal-inner">{children}</div>
    </div>
  );
}
