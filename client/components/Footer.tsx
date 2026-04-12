import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';
import { useI18n } from '@/lib/i18n';
import HelpModal from './HelpModal';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { language } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <footer className="bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center gap-3">
          <div className="text-sm text-[hsl(var(--muted-foreground))] text-center">
            © {currentYear} MAKWIN. All rights reserved. {APP_VERSION}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] text-center">
            Real art, real experiences, real connections
          </div>
          <button
            onClick={() => setHelpOpen(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {language === 'es' ? 'Ayuda & Contacto' : 'Help & Contact'}
          </button>
        </div>
      </footer>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
