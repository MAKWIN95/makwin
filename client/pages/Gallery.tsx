import { useContext, useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorks } from '@/lib/WorksContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import MasonryGrid, { type MasonryColumns } from '@/components/MasonryGrid';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';
import { PageShown, returnToPage } from '@/lib/header-morph';

const PAGE_SIZE = 40;

function preloadImage(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    const image = new Image();
    let finished = false;
    let fallbackTimer: number;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallbackTimer);
      resolve(image.naturalWidth > 0 && image.naturalHeight > 0
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : null);
    };
    image.fetchPriority = 'high';
    image.decoding = 'async';
    const decodeAndFinish = () => {
      void image.decode().catch(() => undefined).then(finish);
    };
    image.onload = decodeAndFinish;
    image.onerror = finish;
    fallbackTimer = window.setTimeout(finish, 3000);
    image.src = src;
    if (image.complete) {
      if (image.naturalWidth > 0) decodeAndFinish();
      else finish();
    }
  });
}

const GRID_COLUMNS: MasonryColumns = { base: 2, sm: 3, lg: 4, xl: 5, '2xl': 6 };
const SKELETON_ITEMS = Array.from({ length: 12 }, (_, i) => i);

export default function Gallery() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { loadUserInteractions } = useWorks();
  const { language: currentLang, t } = useI18n();
  const [works, setWorks] = useState<Work[]>([]);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // The address is the single source of the search, so it survives reloads and shared links.
  const searchTerm = (new URLSearchParams(location.search).get('search') ?? '').replace(/^#/, '').trim();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const workType = new URLSearchParams(location.search).get('tipo') ?? '';
  const [showItems, setShowItems] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const requestSequenceRef = useRef(0);
  const activeUserIdRef = useRef<string | null>(user?.id ?? null);
  activeUserIdRef.current = user?.id ?? null;
  const shown = useContext(PageShown);
  const main = useRef<HTMLElement>(null);
  const pageRef = useRef(0);
  pageRef.current = page;
  // Coming back is not arriving: the entrance only plays the first time.
  const beenAway = useRef(false);
  const wasAway = beenAway.current;
  if (!shown) beenAway.current = true;

  useStarsBackground('gallery-stars-background');

  // ── Fetch feed from Supabase ──────────────────────────────────────────────
  const fetchWorks = useCallback(async (pageNum: number, replace = false, silently = false) => {
    const requestSequence = ++requestSequenceRef.current;
    const requestUserId = user?.id ?? null;
    if (replace && !silently) setLoadError(false);
    // Silently, what is on screen stays until the fresh list arrives.
    if (!silently) {
      if (pageNum === 0) setLoadingInitial(true);
      else setLoadingMore(true);
    }
    // Everything already scrolled through comes back, so the page keeps its length.
    const limit = silently ? (pageRef.current + 1) * PAGE_SIZE : PAGE_SIZE;

    try {
      const { data, error } = await supabase.rpc('get_feed', {
        p_user_id: user?.id ?? null,
        p_limit: limit,
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

      if (requestSequence !== requestSequenceRef.current || requestUserId !== activeUserIdRef.current) return;

      // Decode the first visible masonry row before inserting it. Natural-height
      // images otherwise begin at zero height and reflow the columns/footer as
      // they load, which is especially noticeable when the first card is hovered.
      const preloadedDimensions = await Promise.all(
        (silently ? [] as Work[] : fetched.slice(0, 3)).map(async work => {
          const src = work.cover_url ?? (
            work.work_type === 'pintura' || work.work_type === 'fotografia'
              ? work.file_url
              : null
          );
          return src ? [work.id, await preloadImage(src)] as const : null;
        })
      );

      if (requestSequence !== requestSequenceRef.current || requestUserId !== activeUserIdRef.current) return;

      setImageDimensions(prev => ({
        ...prev,
        ...Object.fromEntries(preloadedDimensions.filter(
          (entry): entry is readonly [string, { width: number; height: number }] => entry?.[1] != null
        )),
      }));

      setWorks(prev => replace ? fetched : [...prev, ...fetched]);
      setHasMore(fetched.length === limit);
      if (!silently) setPage(pageNum);

      // The feed is the render-critical request. Hydrate user-specific
      // interactions independently so a delayed likes/saves query cannot leave
      // a valid public Gallery blank or trigger a feed refresh.
      if (requestUserId && fetched.length > 0) {
        const workIds = fetched.map(w => w.id);
        const likeCounts = Object.fromEntries(
          fetched.map(work => [work.id, Number(work.like_count) || 0])
        );
        void loadUserInteractions(workIds, requestUserId, likeCounts);
      }
    } catch (err) {
      if (requestSequence === requestSequenceRef.current && requestUserId === activeUserIdRef.current) {
        console.error('[Gallery] Feed request failed:', err);
        if (!silently) setLoadError(true);
      }
    } finally {
      if (requestSequence === requestSequenceRef.current && requestUserId === activeUserIdRef.current) {
        setLoadingInitial(false);
        setLoadingMore(false);
        setTimeout(() => setShowItems(true), 100);
      }
    }
  }, [user?.id, loadUserInteractions]);

  useEffect(() => { fetchWorks(0, true); }, [fetchWorks]);

  // Back in view straight away, as it was left; anything new arrives by itself.
  useEffect(() => {
    if (shown && wasAway) void fetchWorks(0, true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  useLayoutEffect(() => {
    if (shown && wasAway) returnToPage(main.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  // Deleted from its own page: it must not reappear for a moment on the way back.
  useEffect(() => {
    const onDeleted = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setWorks(current => current.filter(work => work.id !== id));
    };
    document.addEventListener('workDeleted', onDeleted);
    return () => document.removeEventListener('workDeleted', onDeleted);
  }, []);

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

  // ── Search debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Client-side filter + search (on already-fetched data) ─────────────────
  const filtered = useMemo(() => {
    const lower = debouncedSearch.toLowerCase();
    return works
      .filter(item => {
        if (!lower) return true;
        return (
          item.title.toLowerCase().includes(lower) ||
          item.profiles?.display_name?.toLowerCase().includes(lower) ||
          item.profiles?.username?.toLowerCase().includes(lower) ||
          (item.hashtags ?? []).some(h => h.toLowerCase().includes(lower))
        );
      })
      .filter(item => !workType || item.work_type === workType);
  }, [works, debouncedSearch, workType]);

  // Fade on filter/search change
  useEffect(() => {
    setShowItems(false);
    const t = setTimeout(() => setShowItems(true), 300);
    return () => clearTimeout(t);
  }, [debouncedSearch, workType]);

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
    <div className="relative min-h-screen bg-[hsl(var(--background))]">
      <div id="gallery-stars-background" className="absolute inset-0 z-0 stars-background" />
      <div className={`relative z-10 ${beenAway.current ? '' : 'page-enter'}`}>
        <Header showSearchCentered />

        <main ref={main} className={`w-full ${beenAway.current ? '' : 'page-enter'}`}>
          <div className="px-4 sm:px-8 py-4 sm:py-6">

            {/* Loading skeleton - only show if we don't have cached data */}
            {loadingInitial && works.length === 0 && (
              <MasonryGrid
                items={SKELETON_ITEMS}
                columns={GRID_COLUMNS}
                getKey={String}
                renderItem={(i) => (
                  <div className="mb-4 phone:mb-3 w-full">
                    <div className={`rounded-2xl bg-[hsl(var(--muted))] animate-pulse ${i % 3 === 0 ? 'h-56' : i % 3 === 1 ? 'h-40' : 'h-72'}`} />
                    <div className="mt-2 h-3 bg-[hsl(var(--muted))] rounded animate-pulse w-3/4" />
                    <div className="mt-1 h-2 bg-[hsl(var(--muted))] rounded animate-pulse w-1/2" />
                  </div>
                )}
              />
            )}

            {loadError && (
              <div role="alert" className="w-full py-12 text-center text-[hsl(var(--muted-foreground))]">
                <p className="mb-4">{currentLang === 'es' ? 'No se pudieron cargar las obras.' : 'Works could not be loaded.'}</p>
                <button type="button" onClick={() => fetchWorks(0, true)} className="rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--muted))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))]">
                  {currentLang === 'es' ? 'Reintentar' : 'Try again'}
                </button>
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
                  onClick={() => navigate({ search: '' }, { replace: true })}
                  className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  {t('search.clear')}
                </button>
              </div>
            )}

            {!loadingInitial && !loadError && filtered.length === 0 && !debouncedSearch && (
              <div className="w-full py-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {workType ? (
                  <>
                    <p className="mb-4">{currentLang === 'es' ? 'No hay obras de este tipo todavía.' : 'There are no works of this type yet.'}</p>
                    <button
                      onClick={() => {
                        const params = new URLSearchParams(location.search);
                        params.delete('tipo');
                        navigate({ search: params.toString() }, { replace: true });
                      }}
                      className="glass-button"
                    >
                      {t('filter.clear')}
                    </button>
                  </>
                ) : currentLang === 'es' ? 'Todavía no hay obras publicadas.' : 'There are no published works yet.'}
              </div>
            )}

            {/* Natural-height masonry columns keep each artwork's original ratio. */}
            {works.length > 0 && filtered.length > 0 && (
              <MasonryGrid
                items={filtered}
                columns={GRID_COLUMNS}
                getKey={(item: any) => item.id}
                renderItem={(item: any, index) => (
                  <div className={`mb-4 phone:mb-3 w-full transition-opacity duration-300 ${showItems ? 'opacity-100' : 'opacity-0'}`}>
                    <WorkCard work={item as Work} priorityImage={index < 3} imageDimensions={imageDimensions[item.id]} />
                  </div>
                )}
              />
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
