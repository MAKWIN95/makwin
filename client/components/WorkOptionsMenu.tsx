import { useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface WorkOption {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

interface Props {
  label: string;
  options: WorkOption[];
  className?: string;
}

// The three dots over a work. On touch it opens on the tap, not when the finger
// lands: every card has one, so scrolling would otherwise keep opening menus.
export default function WorkOptionsMenu({ label, options, className }: Props) {
  const [open, setOpen] = useState(false);
  const touch = useRef(false);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerDown={(event) => {
            touch.current = event.pointerType !== 'mouse';
            if (touch.current) event.preventDefault();
          }}
          onClick={() => {
            if (touch.current) setOpen((value) => !value);
          }}
          className={cn('tap-area ios-press flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]', className)}
        >
          <MoreVertical className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        collisionPadding={8}
        onCloseAutoFocus={(event) => {
          if (touch.current) event.preventDefault();
        }}
        className="glass-menu min-w-40 p-1.5"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.label}
            onSelect={option.onSelect}
            className={cn(
              'phone:min-h-11 gap-3 rounded-lg px-3 py-2 cursor-pointer focus:bg-[hsl(var(--foreground)/0.08)]',
              option.danger ? 'text-red-500 focus:text-red-500' : 'text-[hsl(var(--foreground))] focus:text-[hsl(var(--foreground))]',
            )}
          >
            {option.icon}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
