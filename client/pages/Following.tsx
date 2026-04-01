import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import { Loader2, Heart } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';

const PAGE_SIZE = 40;

export default function Following() {
  const { user } = useAuth();
  const { language: currentLang, t } = useI18n();
  const [works, setWorks] = useState<Work[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useStarsBackground('following-stars-background');

  // Fetch works from followed authors
  const fetchFollowingFeed = useCallback(async (pageNum: number, replace = false) => {
    if (!user) return;

    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      // Get list of users being followed
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (!following || following.length === 0) {
        setWorks([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        setShowItems(true);
        return;
      }

      const followingIds = following.map((f: any) => f.following_id);

      // Fetch works from followed users
      const { data, error } = await supabase
        .from('works')
        .select('*, profiles(username, display_name, avatar_url), likes(id), saves(id)')
        .in('user_id', followingIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const fetched = (data ?? []) as Work[];
      setWorks(prev => replace ? fetched : [...prev, ...fetched]);
      setHasMore(fetched.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      console.error('[Following] fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setTimeout(() => setShowItems(true), 100);
    }
  }, [user]);

  useEffect(() => {
    fetchFollowingFeed(0, true);
  }, [fetchFollowingFeed]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchFollowingFeed(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading, loadingMore, fetchFollowingFeed]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Header hideSearch />
        <div className="w-full h-96 flex items-center justify-center">
          <p className="text-[hsl(var(--muted-foreground))]">Debes iniciar sesión para ver este feed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <canvas id="following-stars-background" className="fixed inset-0 pointer-events-none z-0" />

      <Header showSearch showSearchCentered breadcrumb="Siguiendo" />

      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="h-96 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
              <p className="text-[hsl(var(--muted-foreground))]">Cargando feed...</p>
            </div>
          </div>
        )}

        {!loading && works.length === 0 && (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <Heart className="w-12 h-12 text-[hsl(var(--muted-foreground))]/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                No hay contenido
              </h2>
              <p className="text-[hsl(var(--muted-foreground))]">
                Aún no sigues a nadie o no tienen obras publicadas.
              </p>
            </div>
          </div>
        )}

        {showItems && works.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 auto-rows-max space-y-4">
            {works.map((work) => (
              <div key={work.id} className="break-inside-avoid">
                <WorkCard work={work} onWorkDeleted={() => fetchFollowingFeed(0, true)} />
              </div>
            ))}
          </div>
        )}

        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        )}

        <div ref={loaderRef} className="h-4" />
      </main>

      <Footer />
    </div>
  );
}
