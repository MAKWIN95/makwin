import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_DOCS, LEGAL_TEXTS } from '@/lib/legal-texts';
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
            © {currentYear} MAKWIN. {language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'} {APP_VERSION}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] text-center">
            {language === 'es' ? 'Arte real, experiencias reales, conexiones reales' : 'Real art, real experiences, real connections'}
          </div>
          <nav aria-label={language === 'es' ? 'Legal' : 'Legal'} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
            {LEGAL_DOCS.map((doc) => (
              <Link key={doc} to={`/${doc}`} className="tap-area hover:text-[hsl(var(--foreground))] transition-colors">
                {LEGAL_TEXTS[language === 'es' ? 'es' : 'en'][doc].short}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setHelpOpen(true)}
            className="mt-2 inline-flex items-center gap-1 text-xs phone:text-sm px-3 py-1.5 phone:px-4 phone:py-2.5 rounded-full border border-[hsl(var(--muted-foreground)/0.35)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
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
