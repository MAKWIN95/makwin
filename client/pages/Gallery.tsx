import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorks } from '@/lib/WorksContext';
import { songs } from '@/lib/songs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import { Filter } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';

const PAGE_SIZE = 40;

export default function Gallery() {
  const { user } = useAuth();
  const worksContext = useWorks();
  const { language: currentLang, t } = useI18n();
  const [works, setWorks] = useState<Work[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ workType: '', sort: 'score' });
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [filterBtnPos, setFilterBtnPos] = useState({ top: 0, left: 0 });
  const filterRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  useStarsBackground('gallery-stars-background');

  // ── Fetch feed from Supabase ──────────────────────────────────────────────
  const fetchWorks = useCallback(async (pageNum: number, replace = false) => {
    if (pageNum === 0) setLoadingInitial(true);
    else setLoadingMore(true);

    try {
      const { data, error } = await supabase.rpc('get_feed', {
        p_user_id: user?.id ?? null,
        p_limit: PAGE_SIZE,
        p_offset: pageNum * PAGE_SIZE,
      });

      if (error) throw error;

      // Transform RPC data to expected Work type with profiles object
      const fetched = (data ?? []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        description: item.description,
        work_type: item.work_type,
        file_url: item.file_url,
        cover_url: item.cover_url,
        lyrics: item.lyrics,
        hashtags: item.hashtags || [],
        is_for_sale: item.is_for_sale,
        price: item.price,
        status: item.status,
        like_count: item.like_count,
        view_count: item.view_count,
        language: item.language,
        created_at: item.created_at,
        updated_at: item.updated_at,
        policy_flags: item.policy_flags || [],
        profiles: {
          id: item.user_id,
          username: item.username,
          display_name: item.display_name,
          bio: null,
          avatar_url: item.avatar_url,
          website: null,
          instagram_url: null,
          tiktok_url: null,
          is_verified: false,
          is_banned: false,
          language_preference: 'es' as const,
          created_at: '',
          last_name_change: null,
          last_username_change: null,
        },
        liked_by_me: item.liked_by_me || false,
        saved_by_me: item.saved_by_me || false,
      })) as Work[];

      setWorks(prev => replace ? fetched : [...prev, ...fetched]);
      setHasMore(fetched.length === PAGE_SIZE);
      setPage(pageNum);

      // Load user interactions into context (likes/saves from RPC)
      if (user && fetched.length > 0) {
        const workIds = fetched.map(w => w.id);
        // Update context with like/save counts from RPC data
        fetched.forEach(work => {
          if (work.like_count > 0) {
            worksContext.updateLikeCount(work.id, work.like_count);
          }
        });
        // Load full user interactions
        await worksContext.loadUserInteractions(workIds, user.id);
      }
    } catch (err) {
      console.error('[Gallery] fetch error:', err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      setTimeout(() => setShowItems(true), 100);
    }
  }, [user?.id]);

  useEffect(() => { fetchWorks(0, true); }, [fetchWorks]);

  // Reload on header MAKWIN click
  useEffect(() => {
    const onReload = () => fetchWorks(0, true);
    document.addEventListener('reloadGallery', onReload as EventListener);
    return () => document.removeEventListener('reloadGallery', onReload as EventListener);
  }, [fetchWorks]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingInitial) {
        fetchWorks(page + 1);
      }
    }, { threshold: 0.1 });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingInitial, page, fetchWorks]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const onUpdate = (e: Event) => setSearchTerm((e as CustomEvent).detail?.searchTerm ?? '');
    document.addEventListener('updateSearchTerm', onUpdate as EventListener);
    return () => document.removeEventListener('updateSearchTerm', onUpdate as EventListener);
  }, []);

  // ── Filter popup positioning ──────────────────────────────────────────────
  useEffect(() => {
    const onToggle = () => {
      const btn = document.getElementById('filter-btn');
      if (!btn) return;
      
      // Calculate button position
      const rect = btn.getBoundingClientRect();
      setFilterBtnPos({
        top: rect.bottom + window.scrollY + 8,    // 8px below the button
        left: rect.right - 220 + window.scrollX,  // Align to right (popup width 220px)
      });
      
      setShowFilterPopup(p => !p);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        const btn = document.getElementById('filter-btn');
        if (btn && !btn.contains(e.target as Node)) {
          setShowFilterPopup(false);
        }
      }
    };
    document.addEventListener('toggleFilterPopup', onToggle as EventListener);
    if (showFilterPopup) document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('toggleFilterPopup', onToggle as EventListener);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [showFilterPopup]);

  // ── Build combined items (songs + works) ─────────────────────────────────
  const allItems = useMemo(() => {
    const songsAsWorks = songs.map(s => ({
      id: s.id,
      user_id: '',
      title: s.title,
      description: s.description ?? '',
      work_type: 'cancion',
      file_url: null,
      cover_url: s.coverUrl ?? null,
      hashtags: [],
      is_for_sale: false,
      price: null,
      status: 'published' as const,
      like_count: 0,
      view_count: 0,
      language: s.originalLanguage ?? 'en',
      created_at: s.releaseDate ?? '',
      updated_at: s.releaseDate ?? '',
      policy_flags: [],
      profiles: { id: '', username: 'makwin', display_name: 'MAKWIN', avatar_url: null, bio: null, website: null, is_verified: true, is_banned: false, created_at: '' },
      _isSong: true,
      _songSlug: s.slug ?? s.id,
    }));

    return [...songsAsWorks, ...works];
  }, [works]);

  // ── Client-side filter + search (on already-fetched data) ─────────────────
  const filtered = useMemo(() => {
    const lower = debouncedSearch.toLowerCase();
    return allItems
      .filter(item => {
        if (!lower) return true;
        return (
          item.title.toLowerCase().includes(lower) ||
          item.profiles?.display_name?.toLowerCase().includes(lower) ||
          item.profiles?.username?.toLowerCase().includes(lower) ||
          (item.hashtags ?? []).some(h => h.toLowerCase().includes(lower))
        );
      })
      .filter(item => !filters.workType || item.work_type === filters.workType);
  }, [allItems, debouncedSearch, filters.workType]);

  // Fade on filter/search change
  useEffect(() => {
    setShowItems(false);
    const t = setTimeout(() => setShowItems(true), 300);
    return () => clearTimeout(t);
  }, [debouncedSearch, filters.workType]);

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const formatDate = (item: any) => {
    const ds = item.releaseDate || item.created_at;
    if (!ds) return '';
    const d = new Date(ds);
    if (isNaN(d.getTime())) return '';
    const dd = pad2(d.getDate()), mm = pad2(d.getMonth() + 1), yy = String(d.getFullYear()).slice(-2);
    return currentLang === 'es' ? `${dd}/${mm}/${yy}` : `${mm}/${dd}/${yy}`;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="gallery-stars-background" className="stars-background" />
      <div className="relative z-10 page-enter">
        <Header showSearchCentered />

        <main className="w-full page-enter">
          <div className="px-4 sm:px-8 py-4 sm:py-6">

            {/* Filter popup */}
            {showFilterPopup && (
              <div ref={filterRef} className="fixed z-50 bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded-xl shadow-lg p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ top: `${filterBtnPos.top}px`, left: `${Math.max(10, filterBtnPos.left)}px`, width: '200px' }}>
                <select value={filters.workType} onChange={e => setFilters(f => ({ ...f, workType: e.target.value }))}
                  className="w-full px-2 py-2 border border-[hsl(var(--border))] rounded bg-[hsl(var(--input))] text-sm">
                  <option value="">{t('filter.allTypes')}</option>
                  <option value="pintura">{t('filter.painting')}</option>
                  <option value="fotografia">{t('filter.photography')}</option>
                  <option value="poema">{t('filter.poem')}</option>
                  <option value="cancion">{t('filter.song')}</option>
                  <option value="video">{t('filter.video')}</option>
                </select>
                <button onClick={() => setFilters({ workType: '', sort: 'score' })}
                  className="w-full px-2 py-2 text-sm rounded border border-[hsl(var(--border))] bg-[hsl(var(--popover))]">
                  {t('filter.clear')}
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {loadingInitial && (
              <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="inline-block w-full mb-4 break-inside-avoid">
                    <div className={`rounded-2xl bg-[hsl(var(--muted))] animate-pulse ${i % 3 === 0 ? 'h-56' : i % 3 === 1 ? 'h-40' : 'h-72'}`} />
                    <div className="mt-2 h-3 bg-[hsl(var(--muted))] rounded animate-pulse w-3/4" />
                    <div className="mt-1 h-2 bg-[hsl(var(--muted))] rounded animate-pulse w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* No results message */}
            {!loadingInitial && filtered.length === 0 && debouncedSearch && (
              <div className="w-full py-16 text-center">
                <p className="text-[hsl(var(--muted-foreground))] text-lg mb-4">
                  {t('search.noResults')} <span className="font-semibold text-[hsl(var(--foreground))]">"{debouncedSearch}"</span>
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
                  {t('search.tryAgain')}
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  {t('search.clear')}
                </button>
              </div>
            )}

            {/* Works masonry grid */}
            {!loadingInitial && filtered.length > 0 && (
              <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
                {filtered.map((item: any) => {
                  const isSong = item._isSong;
                  const linkPath = isSong ? `/song/${item._songSlug ?? item.id}` : `/work/${item.id}`;

                  if (isSong) {
                    // Render legacy song cards
                    return (
                      <Link key={`song-${item.id}`}
                        to={linkPath}
                        className={`group inline-block w-full mb-4 break-inside-avoid transition-all duration-300 ${showItems ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        <div className="overflow-hidden rounded-2xl glass-effect transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-lg">
                          {item.cover_url
                            ? <img src={item.cover_url} alt={item.title} className="w-full h-auto object-cover block" loading="lazy" />
                            : <div className="flex items-center justify-center min-h-40 text-4xl">🎵</div>
                          }
                        </div>
                        <div className="mt-2 px-1">
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{item.title}</p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">MAKWIN · {formatDate(item)}</p>
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <div key={item.id}
                      className={`inline-block w-full mb-4 break-inside-avoid transition-all duration-300 ${showItems ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      <WorkCard work={item as Work} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loaderRef} className="h-8 flex items-center justify-center">
              {loadingMore && (
                <div className="w-5 h-5 border-2 border-[hsl(var(--muted-foreground))] border-t-[hsl(var(--foreground))] rounded-full animate-spin" />
              )}
            </div>

          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
