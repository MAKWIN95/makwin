import { APP_VERSION } from '@/lib/version';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[hsl(var(--background))] border-t border-[hsl(var(--border))] py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center gap-3">
        <div className="text-sm text-[hsl(var(--muted-foreground))] text-center">
          © {currentYear} MAKWIN. All rights reserved. {APP_VERSION}
        </div>
        <div className="text-xs text-[hsl(var(--muted-foreground))] text-center">
          Real art, real experiences, real connections
        </div>
      </div>
    </footer>
  );
}
