import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useSidebar } from '@/lib/SidebarContext';

export default function NavMenu() {
  const { isOpen, closeSidebar } = useSidebar();
  const { language } = useI18n();
  const es = language === 'es';

  const menuItems = [
    { 
      label: es ? 'INICIO' : 'HOME', 
      description: es ? 'Página de inicio de MAKWIN' : 'MAKWIN home page',
      path: '/home' 
    },
    { 
      label: es ? 'GALERÍA' : 'GALLERY', 
      description: es ? 'Descubre obras seleccionadas de artistas emergentes' : 'Discover works from emerging artists',
      path: '/' 
    },
    { 
      label: es ? 'MARKETPLACE' : 'MARKETPLACE', 
      description: es ? 'Compra y vende arte digital original' : 'Buy and sell original digital art',
      path: '/marketplace' 
    },
    { 
      label: es ? 'TIENDA' : 'MERCH', 
      description: es ? 'Explora merchandising exclusivo de MAKWIN' : 'Explore exclusive MAKWIN merchandise',
      path: '/merch' 
    },
    { 
      label: es ? 'ATTUNED' : 'ATTUNED', 
      description: es ? 'Laboratorio de percepción sensorial. Entrena tu agudeza artística.' : 'Sensory perception laboratory. Train your artistic acuity.',
      path: '/attuned' 
    },
  ];

  return (
    <>
      {/* Overlay - FULL VIEWPORT */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-out"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - FIXED VIEWPORT */}
      <div
        className={`fixed top-0 left-0 h-screen w-80 z-50 transition-transform duration-300 ease-out bg-[hsl(var(--background))] border-r border-[rgba(120,120,120,0.25)] flex flex-col overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          boxShadow: isOpen ? '0 0 40px rgba(255,255,255,0.05)' : 'none'
        }}
      >
        {/* Header */}
        <div className="px-4 py-5 border-b border-[rgba(120,120,120,0.25)] bg-[hsl(var(--background))] flex-shrink-0">
          <h2 className="text-xl font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
            {es ? 'Explorar' : 'Explore'}
          </h2>
        </div>

        {/* Menu Items - Scrollable Center */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 bg-[hsl(var(--background))]">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="block p-4 rounded-xl border border-[rgba(120,120,120,0.25)] hover:border-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-all duration-250 ease-out group"
              onClick={() => closeSidebar()}
            >
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))] group-hover:translate-x-1 transition-transform duration-200">
                {item.label}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5 leading-relaxed">
                {item.description}
              </p>
            </Link>
          ))}
        </nav>

        {/* Footer - Sticky Bottom */}
        <div className="p-4 border-t border-[rgba(120,120,120,0.25)] bg-[hsl(var(--background))] text-xs text-[hsl(var(--muted-foreground))] text-center flex-shrink-0">
          {es ? 'MAKWIN © 2026' : 'MAKWIN © 2026'}
        </div>
      </div>
    </>
  );
}

