import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useWorks } from '@/lib/WorksContext';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import MasonryGrid, { type MasonryColumns } from '@/components/MasonryGrid';
import { Loader2, Bookmark } from 'lucide-react';

const GRID_COLUMNS: MasonryColumns = { base: 2, sm: 3, lg: 4, xl: 5, '2xl': 6 };

const FIRST_ON_SCREEN = 4;

// Coming back shows at once what was here; it is brought up to date out of sight.
let lastSeen: { userId: string; works: Work[] } | null = null;

export default function Saved() {
  useRequireAuth();
  useStarsBackground('saved-stars-background');
  const { user } = useAuth();
  const worksContext = useWorks();
  const { language } = useI18n();
  const es = language === 'es';

  const known = lastSeen?.userId === user?.id ? lastSeen : null;
  const [works, setWorks] = useState<Work[]>(known?.works ?? []);
  const [loading, setLoading] = useState(!known);

  useEffect(() => {
    if (!user) return;
    let current = true;
    const load = async () => {
      try {
        // All in one request. A work no longer visible to you simply does not come back.
        const { data, error } = await supabase
          .from('saves')
          .select('created_at, works!inner(*, profiles!user_id(id, username, display_name, avatar_url, is_verified, is_banned))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!current) return;

        const saved = (data ?? []).map((save: any) => ({
          ...save.works,
          hashtags: save.works.hashtags || [],
          liked_by_me: false,
          saved_by_me: true,
        })) as Work[];
        lastSeen = { userId: user.id, works: saved };
        setWorks(saved);
        setLoading(false);

        // The works are already on screen: hearts and counts catch up behind them.
        if (saved.length > 0) {
          void worksContext.loadUserInteractions(
            saved.map(w => w.id),
            user.id,
            Object.fromEntries(saved.map(work => [work.id, Number(work.like_count) || 0]))
          );
        }
      } catch (err) {
        console.error('[Saved] Error loading saved works:', err);
        if (current && !lastSeen) setWorks([]);
        if (current) setLoading(false);
      }
    };

    load();
    return () => { current = false; };
  }, [user?.id]);

  const handleSaveToggle = (workId: string, saved: boolean) => {
    // Optimistic update: remove from local state when unsaved
    if (!saved) {
      setWorks(prev => prev.filter(w => w.id !== workId));
      if (lastSeen) lastSeen = { ...lastSeen, works: lastSeen.works.filter(w => w.id !== workId) };
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="saved-stars-background" className="absolute inset-0 z-0 stars-background" />
      <div className="relative z-10">
      <Header showSearchCentered />
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 page-enter">

        <div className="flex items-center gap-3 mb-8">
          <Bookmark className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          <h1 className="text-2xl font-light text-[hsl(var(--foreground))]">
            {es ? 'Guardados' : 'Saved'}
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[hsl(var(--border))] rounded-2xl">
            <Bookmark className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4">
              {es ? 'Aún no has guardado ninguna obra.' : "You haven't saved any works yet."}
            </p>
            <Link to="/galeria" className="tap-area text-sm text-[hsl(var(--foreground))] underline underline-offset-2">
              {es ? 'Explorar galería →' : 'Explore gallery →'}
            </Link>
          </div>
        ) : (
          <MasonryGrid
            items={works}
            columns={GRID_COLUMNS}
            getKey={work => work.id}
            renderItem={(work, index) => (
              <div className="mb-4 phone:mb-3 w-full">
                <WorkCard work={work} onSaveToggle={handleSaveToggle} priorityImage={index < FIRST_ON_SCREEN} />
              </div>
            )}
          />
        )}

      </main>
      <Footer />
      </div>
    </div>
  );
}
