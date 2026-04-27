import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

export default function NavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useI18n();
  const es = language === 'es';
  const navigate = useNavigate();

  const menuItems = [
    { label: es ? 'Galería' : 'Gallery', path: '/' },
    { label: es ? 'Inicio' : 'Home', path: '/home' },
    { label: es ? 'Marketplace' : 'Marketplace', path: '/marketplace' },
    { label: es ? 'Tienda' : 'Merch', path: '/merch' },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
        aria-label="Menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-[hsl(var(--foreground))]" />
        ) : (
          <Menu className="w-5 h-5 text-[hsl(var(--foreground))]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-lg shadow-lg p-2 min-w-48 z-50">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block w-full text-left px-4 py-2 rounded hover:bg-[hsl(var(--muted))] transition-colors text-[hsl(var(--foreground))] text-sm"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
