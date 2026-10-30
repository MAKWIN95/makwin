import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { supabase, Work } from '@/lib/supabase';
import { useStarsBackground } from '@/hooks/use-stars-background';
import { useI18n } from '@/lib/i18n';

export default function Marketplace() {
  const { language } = useI18n();
  const es = language === 'es';
  const [items, setItems] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ workType: '' });

  // Initialize stars background
  useStarsBackground('marketplace-stars-background');

  const loadItems = async () => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from('works')
      .select('*, profiles!user_id(id, username, display_name, avatar_url)')
      .eq('is_for_sale', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[Marketplace] Could not load works:', error);
      setLoadError(true);
    } else {
      setItems((data ?? []) as unknown as Work[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const visibleItems = items.filter(item => !filters.workType || item.work_type === filters.workType);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="marketplace-stars-background" className="absolute inset-0 z-0 stars-background"></div>
      <div className="relative z-10 page-enter">
        <Header showSearch={true} />
        <main className="px-4 sm:px-8 py-8 page-enter">
        <div className="max-w-6xl mx-auto min-h-[50vh]">
          <div className="flex justify-between items-start gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-light mb-4">MakwinPlace</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{es ? 'Piezas disponibles para comprar. Contacta con el artista desde su perfil para cerrar la operación.' : 'Works available to purchase. Contact the artist through their profile to complete the transaction.'}</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0 p-2 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
              aria-label={es ? 'Filtrar' : 'Filter'}
            >
              <Filter size={16} className="text-[hsl(var(--muted-foreground))]" />
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
                <option value="">{es ? 'Todos los tipos' : 'All types'}</option>
                <option value="pintura">{es ? 'Pintura' : 'Painting'}</option>
                <option value="fotografia">{es ? 'Fotografía' : 'Photography'}</option>
                <option value="poema">{es ? 'Poema' : 'Poem'}</option>
                <option value="cancion">{es ? 'Canción' : 'Song'}</option>
                <option value="video">{es ? 'Vídeo' : 'Video'}</option>
              </select>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">{es ? 'Cargando...' : 'Loading...'}</div>
          ) : loadError ? (
            <div role="alert" className="py-12 text-center text-[hsl(var(--muted-foreground))]">
              <p className="mb-4">{es ? 'No se pudieron cargar las obras.' : 'Works could not be loaded.'}</p>
              <button type="button" onClick={loadItems} className="rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--muted))]">
                {es ? 'Reintentar' : 'Try again'}
              </button>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">{es ? 'No hay obras en venta ahora mismo.' : 'There are no works for sale right now.'}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleItems.map(item => {
                const isImageWork = item.work_type === 'pintura' || item.work_type === 'fotografia';
                const image = item.cover_url ?? (isImageWork ? item.file_url : null);
                return (
                  <article key={item.id} className="rounded-lg border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
                    <Link to={`/work/${item.id}`} className="block h-56 bg-[hsl(var(--muted))]">
                      {image ? (
                        <img src={image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-4xl">🎨</div>
                      )}
                    </Link>
                    <div className="p-4">
                      <h3 className="text-sm font-medium truncate">{item.title}</h3>
                      {item.profiles?.username && (
                        <Link to={`/u/${item.profiles.username}`} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                          @{item.profiles.username}
                        </Link>
                      )}
                      {item.price != null && <p className="text-sm font-semibold mt-2">{Number(item.price).toLocaleString(es ? 'es-ES' : 'en-US', { style: 'currency', currency: 'EUR' })}</p>}
                      <div className="mt-4 flex gap-2 text-sm">
                        <Link to={`/work/${item.id}`} className="flex-1 text-center rounded-lg border border-[hsl(var(--border))] px-3 py-2 hover:bg-[hsl(var(--muted))] transition-colors">{es ? 'Ver' : 'View'}</Link>
                        {item.profiles?.username && (
                          <Link to={`/u/${item.profiles.username}`} className="flex-1 text-center rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] px-3 py-2 hover:opacity-90 transition-opacity">{es ? 'Ver artista' : 'View artist'}</Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
