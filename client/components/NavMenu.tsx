import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

export default function NavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useI18n();
  const es = language === 'es';

  const menuItems = [
    { label: es ? 'Galería' : 'Gallery', path: '/' },
    { label: es ? 'Marketplace' : 'Marketplace', path: '/marketplace' },
    { label: es ? 'Tienda' : 'Merch', path: '/merch' },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors duration-200 relative w-10 h-10 flex items-center justify-center"
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <div className="relative w-5 h-5">
          {/* Line 1 */}
          <span
            className={`absolute h-0.5 w-5 bg-[hsl(var(--foreground))] transition-all duration-300 ease-out origin-center ${
              isOpen ? 'rotate-45 top-2' : 'top-1'
            }`}
          />
          {/* Line 2 */}
          <span
            className={`absolute h-0.5 w-5 bg-[hsl(var(--foreground))] transition-all duration-300 ease-out top-2 ${
              isOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          {/* Line 3 */}
          <span
            className={`absolute h-0.5 w-5 bg-[hsl(var(--foreground))] transition-all duration-300 ease-out origin-center ${
              isOpen ? '-rotate-45 top-2' : 'top-3'
            }`}
          />
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen w-72 bg-[hsl(var(--background))] border-r border-[hsl(var(--border))] shadow-xl transition-transform duration-300 ease-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {es ? 'Menú' : 'Menu'}
          </h2>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="block px-4 py-3 rounded-lg text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all duration-200 hover:pl-5 text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] text-center">
          {es ? 'MAKWIN © 2025' : 'MAKWIN © 2025'}
        </div>
      </div>
    </>
  );
}
