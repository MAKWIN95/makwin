import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

export default function NavMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useI18n();
  const es = language === 'es';

  const menuItems = [
    { 
      label: es ? 'Inicio' : 'Home', 
      description: es ? 'Página de inicio de MAKWIN' : 'MAKWIN home page',
      path: '/home' 
    },
    { 
      label: es ? 'Galería' : 'Gallery', 
      description: es ? 'Descubre obras seleccionadas de artistas emergentes' : 'Discover works from emerging artists',
      path: '/' 
    },
    { 
      label: es ? 'Marketplace' : 'Marketplace', 
      description: es ? 'Compra y vende arte digital original' : 'Buy and sell original digital art',
      path: '/marketplace' 
    },
    { 
      label: es ? 'Tienda' : 'Merch', 
      description: es ? 'Explora merchandising exclusivo de MAKWIN' : 'Explore exclusive MAKWIN merchandise',
      path: '/merch' 
    },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-all duration-200 ease-out relative w-10 h-10 flex items-center justify-center"
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
        className={`fixed left-0 top-0 h-screen w-80 bg-[hsl(var(--background))] border-r border-[hsl(var(--border))] shadow-2xl transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ willChange: isOpen ? 'transform' : 'auto' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[hsl(var(--border))]">
          <h2 className="text-xl font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
            {es ? 'Explorar' : 'Explore'}
          </h2>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="block p-4 rounded-xl border border-[hsl(var(--border))] hover:border-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all duration-250 ease-out group"
                onClick={() => setIsOpen(false)}
              >
                <h3 className="text-base font-semibold text-[hsl(var(--foreground))] group-hover:translate-x-1 transition-transform duration-200">
                  {item.label}
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] text-center">
          {es ? 'MAKWIN © 2026' : 'MAKWIN © 2026'}
        </div>
      </div>
    </>
  );
}
