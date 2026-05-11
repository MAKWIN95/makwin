import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import WorkTypeIcon from '@/components/WorkTypeIcon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Filter } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';

function MetaGrid({ title, artist, date }: { title: string; artist?: string; date?: string }) {
  // Grid with three columns: title (flexible, wraps), artist (auto, may wrap), date (auto, no-wrap)
  return (
    <div className="w-full text-gray-500 text-xs" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', alignItems: 'start' }}>
      <div className="break-words">{title}</div>
      <div className="px-2 text-center break-words">{artist}</div>
      <div className="text-right whitespace-nowrap">{date}</div>
    </div>
  );
}

interface PublishedWork {
  submissionId: string;
  artistName: string;
  workType: string;
  title: string;
  description: string;
  fileUrl: string | null;
  coverImageUrl?: string | null;
  status: string;
  publishedAt: string;
}

export default function Index() {
  const { language: currentLang, t } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [works, setWorks] = useState<PublishedWork[]>([]);
  const [filters, setFilters] = useState({ workType: '', sort: 'recent' });
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [filterStyle, setFilterStyle] = useState<React.CSSProperties | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  
  // Initialize stars background
  useStarsBackground('gallery-stars-background');
  
  const handleMakwinClick = () => {
    // Reset filters and search
    setSearchTerm('');
    setDebouncedSearch('');
    setFilters({ workType: '', sort: 'recent' });
  };

  // Fetch published works (exposed so Header can trigger reload)
  const fetchWorks = async () => {
    try {
      setLoadingWorks(true);
      const response = await fetch("/api/get-submissions");
      const data = await response.json();
      if (data.submissions) {
        const published = data.submissions.filter(
          (work: PublishedWork) => work.status === "published"
        );
        setWorks(published);
      }
    } catch (error) {
      console.error("Error fetching published works:", error);
    } finally {
      setLoadingWorks(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchWorks();
    // Small delay so items appear together (0.5s for testing)
    const t = setTimeout(() => setShowItems(true), 500);
    return () => clearTimeout(t);
  }, []);

  // listen for reload requests from header
  useEffect(() => {
    const onReload = () => fetchWorks();
    document.addEventListener('reloadGallery', onReload as EventListener);
    return () => document.removeEventListener('reloadGallery', onReload as EventListener);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
    };
    const handleToggleFilter = () => {
      // Compute popup position under the filter button
      const btn = document.getElementById('filter-btn');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const popupWidth = 220; // narrower popup
        const left = rect.left + rect.width / 2 - popupWidth / 2 + window.scrollX;
        const top = rect.bottom + 8 + window.scrollY;
        setFilterStyle({ position: 'absolute', left: `${Math.max(8, left)}px`, top: `${top}px`, width: `${popupWidth}px` });
      }
      setShowFilterPopup(prev => !prev);
    };
    const handleUpdateSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSearchTerm(customEvent.detail?.searchTerm || "");
    };
    if (showFilterPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    document.addEventListener('toggleFilterPopup', handleToggleFilter);
    document.addEventListener('updateSearchTerm', handleUpdateSearch);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('toggleFilterPopup', handleToggleFilter);
      document.removeEventListener('updateSearchTerm', handleUpdateSearch);
    };
  }, [showFilterPopup]);

  const filteredAndSorted = useMemo(() => {
    // Use only database works
    const combined = [...works];

    // Search: by title, artist, or hashtag
    const searchLower = debouncedSearch.toLowerCase();
    const searched = combined.filter((item: any) => {
      if (!debouncedSearch) return true;
      return item.title.toLowerCase().includes(searchLower) || 
        item.artistName?.toLowerCase().includes(searchLower) ||
        (Array.isArray(item.hashtags) && item.hashtags.some(tag => tag.toLowerCase().includes(searchLower)));
    });

    // Filter by workType if specified
    const typeFiltered = searched.filter(item => {
      if (!filters.workType) return true;
      return item.workType.toLowerCase() === filters.workType.toLowerCase();
    });

    // Sort: recent (default) or oldest
    return typeFiltered.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.publishedAt || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.publishedAt || b.date || 0).getTime();
      return filters.sort === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }, [searchTerm, filters, works]);

  // Debounce searchTerm updates so results appear after 0.5s and fade-in
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // trigger fade-in when debounced search or filters change
  useEffect(() => {
    setShowItems(false);
    const t = setTimeout(() => setShowItems(true), 500);
    return () => clearTimeout(t);
  }, [debouncedSearch, filters]);

  // format date per language: es => DD/MM/YY, en => MM/DD/YY. Prefer releaseDate for songs.
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const formatDateString = (item: any) => {
    const dateStr = item.releaseDate || item.publishedAt || item.createdAt || item.timestamp || item.date;
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yy = String(d.getFullYear()).slice(-2);
    if (currentLang === 'es') return `${dd}/${mm}/${yy}`;
    return `${mm}/${dd}/${yy}`;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="gallery-stars-background" className="stars-background"></div>
      <div className="relative z-10 page-enter">
        <Header showSearchCentered={true} />

      {/* Main Content */}
      <main className="w-full page-enter">
        {/* Masonry Container - Songs and Works Combined (Pinterest-like) */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          {/* Filter Popup */}
          {showFilterPopup && (
            <div ref={filterRef} style={filterStyle || undefined} className="z-50 bg-white dark:bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-xl shadow-lg p-3 flex flex-col gap-2 items-stretch animate-in fade-in slide-in-from-top-2 duration-200">
              <select value={filters.workType} onChange={e => setFilters(f => ({ ...f, workType: e.target.value }))} className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded bg-[hsl(var(--input))] text-sm">
                <option value="">{t('filter.allTypes')}</option>
                <option value="pintura">{t('filter.painting')}</option>
                <option value="fotografia">{t('filter.photography')}</option>
                <option value="poema">{t('filter.poem')}</option>
                <option value="cancion">{t('filter.song')}</option>
                <option value="video">{t('filter.video')}</option>
              </select>
              <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded bg-[hsl(var(--input))] text-sm">
                <option value="recent">{t('filter.recent')}</option>
                <option value="oldest">{t('filter.oldest')}</option>
              </select>
              <button onClick={() => setFilters({ workType: '', sort: 'recent' })} className="w-full px-2 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-[hsl(var(--popover))]">{t('filter.clear')}</button>
            </div>
          )}
          {filteredAndSorted.length === 0 && debouncedSearch ? (
            <div className="w-full py-16 text-center">
              <p className="text-[hsl(var(--muted-foreground))] text-lg mb-4">
                No hay resultados para <span className="font-semibold text-[hsl(var(--foreground))]">"{debouncedSearch}"</span>
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Intenta con otro término de búsqueda
              </p>
              <button
                onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }}
                className="mt-4 px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
            {/* Combined Works and Songs */}
            {filteredAndSorted.map((item: any) => {
              const isSong = item.workType === 'cancion';
              const isPoem = item.workType?.toLowerCase().includes('poesia') || 
                            item.workType?.toLowerCase().includes('poema') || 
                            item.workType?.toLowerCase().includes('texto');
              const gradient = getWorkGradient(item.workType);
              
              // Imagen para pinturas/fotos: coverImageUrl > fileUrl
              const isPainting = item.workType?.toLowerCase().includes('pintura');
              const isPhoto = item.workType?.toLowerCase().includes('fotografia') || item.workType?.toLowerCase().includes('fotografía');
              const hasCoverImage = !!item.coverImageUrl;
              const hasMainImage = !!item.fileUrl;
              const hasSongCover = isSong && !!item.coverUrl;
              // Canciones verticales especiales
              const verticalSongs = [
                'Before Summer Ends',
                'You Left Me For The Other Guy',
                'Your Problems Are Not Mine Anymore'
              ];
              const isVerticalSong = isSong && verticalSongs.includes(item.title);

              const linkId = isSong ? item.id : item.submissionId;
              const linkSlug = isSong ? (item.slug ?? item.id) : linkId;
              const linkPath = `/work/${linkId}`;

              return (
                <Link
                  key={linkId}
                  to={linkPath}
                  className={`group inline-block w-full mb-4 break-inside-avoid cursor-pointer transition-all duration-300 ${showItems ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                >
                  {/* Imagen principal */}
                  <div className={`overflow-hidden rounded-2xl glass-effect transition-all duration-300 ease-out transform will-change-transform group-hover:scale-105 group-hover:shadow-lg relative z-10 ${!hasCoverImage && !hasMainImage && !hasSongCover ? `bg-gradient-to-br ${gradient}` : ''}`}>
                    {/* Work type badge moved to bottom center (adaptive color) */}
                    {(() => {
                      const imgSrc = item.coverImageUrl || item.fileUrl || item.coverUrl || null;
                      const isPoemLocal = item.workType?.toLowerCase().includes('poesia') || item.workType?.toLowerCase().includes('poema') || item.workType?.toLowerCase().includes('texto');
                      const forceTheme = isPoemLocal && !imgSrc;
                      return <WorkTypeIcon workType={item.workType} imageSrc={imgSrc} forceThemeColor={forceTheme} />;
                    })()}
                    {hasCoverImage ? (
                      <img src={item.coverImageUrl} alt={item.title} className="w-full h-auto object-cover block" />
                    ) : (isPainting || isPhoto) && hasMainImage ? (
                      <img src={item.fileUrl} alt={item.title} className="w-full h-auto object-cover block" />
                    ) : isSong && hasSongCover ? (
                      <img src={item.coverUrl} alt={item.title} className={`w-full h-56 object-cover block ${isVerticalSong ? 'aspect-[3/4]' : ''}`} />
                    ) : isPoem ? (
                      <div className="flex items-center justify-center min-h-56 w-full">
                        <div className="bg-white dark:bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl px-6 py-6 w-full flex items-center justify-center">
                          <p className="text-center text-[hsl(var(--foreground))] text-base font-light whitespace-pre-line leading-relaxed">&quot;{item.description.split('\n').filter(line => line.trim()).slice(0, 4).join('\n')}&quot;</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-4xl">3a8</div>
                    )}

                    
                  </div>

                  {/* Metadata bar: fuera de la imagen, justo debajo */}
                  <div className="mt-3 text-center px-2">
                    <div className="w-full text-xs sm:text-sm px-2 py-1">
                      <div className="text-center leading-tight text-sm font-medium break-words text-[hsl(var(--foreground))]">{item.title}</div>
                      <div className="mt-0.5 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-xs gap-2">
                        <div className="max-w-[60%] text-center break-words">{item.artist || item.artistName}</div>
                        <div aria-hidden className="text-[hsl(var(--muted-foreground))]">●</div>
                        <div className="text-center whitespace-nowrap">{formatDateString(item)}</div>
                      </div>
                    </div>
                  </div>
                  
                </Link>
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

function getWorkGradient(workType: string): string {
  const type = workType.toLowerCase();
  if (type.includes('musica') || type.includes('música')) return 'from-purple-600 to-purple-900';
  if (type.includes('fotografia') || type.includes('fotografía')) return 'from-blue-600 to-blue-900';
  if (type.includes('video')) return 'from-red-600 to-red-900';
  if (type.includes('poesia') || type.includes('poema') || type.includes('texto')) return 'from-pink-600 to-pink-900';
  return 'from-gray-600 to-gray-800';
}

