import { Link, useLocation } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function SubmitButton() {
  const location = useLocation();

  // Only show submit button on gallery or marketplace related pages
  const path = location.pathname || '';
  if (!(path.startsWith('/galeria') || path.startsWith('/marketplace'))) {
    return null;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="submit-like fixed top-6 right-28 z-50 flex items-center justify-center cursor-pointer"
          onMouseMove={(e) => {
            const el = e.currentTarget as HTMLElement;
            const r = el.getBoundingClientRect();
            const mx = ((e.clientX - r.left) / r.width) * 100 + '%';
            const my = ((e.clientY - r.top) / r.height) * 100 + '%';
            el.style.setProperty('--mx', mx);
            el.style.setProperty('--my', my);
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.setProperty('--mx', '50%');
            el.style.setProperty('--my', '50%');
          }}
          onClick={() => window.location.href = '/enviar-obra'}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center">
            <Upload size={22} strokeWidth={1.5} />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-black text-white border border-[hsl(var(--border))]">
        <p className="text-xs sm:text-sm">Enviar obra</p>
      </TooltipContent>
    </Tooltip>
  );
}
