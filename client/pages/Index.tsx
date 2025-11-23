import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { songs } from '@/lib/songs';
import Header from '@/components/Header';
import { Filter } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState("");
  const [works, setWorks] = useState<PublishedWork[]>([]);
  const [filters, setFilters] = useState({ workType: '', sort: 'recent' });
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const handleMakwinClick = () => {
    window.location.href = '/';
  };

  // Fetch published works
  useEffect(() => {
    const fetchWorks = async () => {
      try {
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

    fetchWorks();
    setTimeout(() => setShowItems(true), 120);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
    };
    const handleToggleFilter = () => {
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
    // Combine songs and works
    const combined = [
      ...songs.map(s => ({ ...s, workType: 'cancion' as const, hashtags: [] as string[] })),
      ...works
    ];

    // Search: by title, artist, or hashtag
    const searchLower = searchTerm.toLowerCase();
    const searched = combined.filter((item: any) => {
      if (!searchTerm) return true;
      return item.title.toLowerCase().includes(searchLower) || 
        item.artistName?.toLowerCase().includes(searchLower) ||
        item.artist?.toLowerCase().includes(searchLower) ||
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
  }, [searchTerm, filters, songs, works]);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header />

      {/* Main Content */}
      <main className="w-full page-enter">
        {/* Masonry Container - Songs and Works Combined (Pinterest-like) */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          {/* Filter Popup */}
          {showFilterPopup && (
            <div ref={filterRef} className="max-w-6xl mx-auto mb-4 p-4 border rounded-lg bg-[hsl(var(--popover))] shadow-md">
              <div className="flex gap-3 items-center flex-wrap">
                <select value={filters.workType} onChange={e => setFilters(f => ({ ...f, workType: e.target.value }))} className="px-3 py-2 border rounded bg-[hsl(var(--input))] text-sm">
                  <option value="">Todos los tipos</option>
                  <option value="pintura">Pintura</option>
                  <option value="fotografia">Fotografía</option>
                  <option value="poema">Poema</option>
                  <option value="cancion">Canción</option>
                  <option value="video">Video</option>
                </select>
                <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} className="px-3 py-2 border rounded bg-[hsl(var(--input))] text-sm">
                  <option value="recent">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                </select>
                <button onClick={() => setFilters({ workType: '', sort: 'recent' })} className="px-3 py-2 text-sm rounded border bg-[hsl(var(--popover))]">Limpiar</button>
              </div>
            </div>
          )}
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
            {/* Combined Works and Songs */}
            {filteredAndSorted.map((item: any) => {
              const isSong = item.workType === 'cancion';
              const isPoem = item.workType?.toLowerCase().includes('poesia') || 
                            item.workType?.toLowerCase().includes('poema') || 
                            item.workType?.toLowerCase().includes('texto');
              const gradient = getWorkGradient(item.workType);
              
              // Display logic: prefer coverImageUrl if available, fallback to fileUrl or song cover
              const hasCoverImage = !!item.coverImageUrl;
              const hasMainImage = !!item.fileUrl;
              const hasSongCover = isSong && !!item.coverUrl;

              const linkId = isSong ? item.id : item.submissionId;
              const linkSlug = isSong ? (item.slug ?? item.id) : linkId;
              const linkPath = isSong ? `/song/${linkSlug}` : `/work/${linkId}`;

              return (
                <Link
                  key={linkId}
                  to={linkPath}
                  className={`group inline-block w-full mb-4 break-inside-avoid cursor-pointer transition-all duration-300 ${showItems ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                >
                  {/* Cover Image */}
                  <div className={`overflow-hidden rounded-2xl glass-effect transition-all duration-300 ease-out ${!hasCoverImage && !hasMainImage && !hasSongCover ? `bg-gradient-to-br ${gradient}` : ''}`}>
                    {hasCoverImage ? (
                      <img src={item.coverImageUrl} alt={item.title} className="w-full h-auto object-cover block" />
                    ) : hasMainImage && !isPoem ? (
                      <img src={item.fileUrl} alt={item.title} className="w-full h-auto object-cover block" />
                    ) : hasSongCover ? (
                      <img src={item.coverUrl} alt={item.title} className="w-full h-auto object-cover block" />
                    ) : isPoem ? (
                      <div className="p-4 text-left min-h-80 flex flex-col justify-start bg-gradient-to-br from-pink-600 to-pink-900">
                        <p className="text-[hsl(var(--card-foreground))] text-sm leading-relaxed line-clamp-6">
                          {item.description.split('\n').filter(line => line.trim()).slice(0, 3).join(' ')}
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-4xl">🎨</div>
                    )}
                  </div>

                  {/* Title and Artist */}
                  <div className="px-1 mt-2">
                    <h3 className="text-xs sm:text-sm font-light text-[hsl(var(--foreground))] whitespace-normal break-words group-hover:text-[hsl(var(--foreground))/0.7] transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-xs font-light text-[hsl(var(--foreground))/0.4] mt-0.5 transition-colors duration-300 group-hover:text-[hsl(var(--foreground))/0.5]">
                      {item.artist || item.artistName}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
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
