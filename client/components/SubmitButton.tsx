import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function SubmitButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/enviar-obra"
          id="submit-work-btn"
          className="fixed bottom-8 left-32 p-3 rounded-full bg-black text-white hover:bg-black/90 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl z-40"
          aria-label="Enviar obra"
        >
          <Upload size={24} strokeWidth={1.5} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-black text-white border border-[hsl(var(--border))]">
        <p className="text-xs sm:text-sm">Enviar obra</p>
      </TooltipContent>
    </Tooltip>
  );
}
