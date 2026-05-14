import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useStarsBackground } from '@/hooks/use-stars-background';

export default function Marketplace() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ workType: '' });

  // Initialize stars background
  useStarsBackground('marketplace-stars-background');

  const handleMakwinClick = () => {
    // Reload items on MAKWIN click
    loadItems();
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/get-submissions');
      const data = await res.json();
      if (data.submissions) {
        const forSale = data.submissions.filter((s: any) => s.isForSale && s.status === 'published');
        setItems(forSale);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Listen for reload requests from header
  useEffect(() => {
    const onReload = () => loadItems();
    document.addEventListener('reloadGallery', onReload as EventListener);
    return () => document.removeEventListener('reloadGallery', onReload as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="marketplace-stars-background" className="stars-background"></div>
      <div className="relative z-10 page-enter">
        <Header showSearch={true} />
        <main className="px-4 sm:px-8 py-0 page-enter">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-light mb-4">MAKWIN Marketplace</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Piezas disponibles para compra. Contacta con el artista para cerrar la operación.</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              title="Filtros"
            >
              ⊙
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-6 p-4 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-lg">
              <select
                value={filters.workType}
                onChange={(e) => setFilters({ ...filters, workType: e.target.value })}
                className="w-full md:w-48 px-2 py-2 border border-[hsl(var(--border))] rounded bg-[hsl(var(--input))] text-sm focus:outline-none focus:ring-0"
              >
                <option value="">Todos los tipos</option>
                <option value="pintura">Pintura</option>
                <option value="fotografia">Fotografía</option>
                <option value="poema">Poema</option>
                <option value="cancion">Canción</option>
                <option value="video">Video</option>
              </select>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">No hay obras en venta ahora mismo.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items
                .filter(item => !filters.workType || item.work_type === filters.workType)
                .map(item => (
                <article key={item.submissionId} className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                  <div className="h-56 bg-gray-100 flex items-center justify-center">
                    {item.fileUrl ? (
                      <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-4xl">🎨</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.artistName}</p>
                    <p className="text-sm font-semibold mt-2">€{item.price}</p>
                    <div className="mt-4 flex gap-2">
                      <a href={`mailto:${item.email}?subject=Interesado en ${encodeURIComponent(item.title)}`} className="btn">Contactar</a>
                      <Link to={`/work/${item.submissionId}`} className="btn">Ver</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
