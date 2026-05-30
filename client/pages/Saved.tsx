import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorks } from '@/lib/WorksContext';
import { useI18n } from '@/lib/i18n';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import { Loader2, Bookmark } from 'lucide-react';

export default function Saved() {
  const { user } = useAuth();
  const worksContext = useWorks();
  const { language } = useI18n();
  const es = language === 'es';

  // Initialize stars background animation
  useStarsBackground('saved-stars-background');

  if (!user) return <Navigate to="/login" replace />;

  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get saved works with full details
        const { data: savesData } = await supabase
          .from('saves')
          .select('work_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!savesData || savesData.length === 0) {
          setWorks([]);
          setLoading(false);
          return;
        }

        const workIds = savesData.map(s => s.work_id);

        // Get works with profiles and counts
        const { data: worksData } = await supabase
          .from('works')
          .select(`
            id,
            user_id,
            title,
            description,
            work_type,
            file_url,
            cover_url,
            lyrics,
            hashtags,
            is_for_sale,
            price,
            status,
            like_count,
            view_count,
            language,
            created_at,
            updated_at,
            profiles!user_id(id, username, display_name, avatar_url, bio, website, instagram_url, tiktok_url, is_verified, is_banned)
          `)
          .in('id', workIds)
          .order('created_at', { ascending: false });

        if (!worksData || worksData.length === 0) {
          setWorks([]);
          setLoading(false);
          return;
        }

        // Transform data and load interactions into context
        const transformed = worksData.map((work: any) => ({
          id: work.id,
          user_id: work.user_id,
          title: work.title,
          description: work.description,
          work_type: work.work_type,
          file_url: work.file_url,
          cover_url: work.cover_url,
          lyrics: work.lyrics,
          hashtags: work.hashtags || [],
          is_for_sale: work.is_for_sale,
          price: work.price,
          status: work.status,
          like_count: work.like_count,
          view_count: work.view_count,
          language: work.language,
          created_at: work.created_at,
          updated_at: work.updated_at,
          profiles: work.profiles,
          liked_by_me: false,
          saved_by_me: true,
        })) as Work[];

        setWorks(transformed);

        // Load interactions into context
        if (transformed.length > 0) {
          await worksContext.loadUserInteractions(transformed.map(w => w.id), user.id);
        }
      } catch (err) {
        console.error('[Saved] Error loading saved works:', err);
        setWorks([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user.id]);

  const handleSaveToggle = (workId: string, saved: boolean) => {
    // Optimistic update: remove from local state when unsaved
    if (!saved) {
      setWorks(prev => prev.filter(w => w.id !== workId));
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="saved-stars-background" className="stars-background" />
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
            <Link to="/galeria" className="text-sm text-[hsl(var(--foreground))] underline underline-offset-2">
              {es ? 'Explorar galería →' : 'Explore gallery →'}
            </Link>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4">
            {works.map(work => (
              <div key={work.id} className="break-inside-avoid">
                <WorkCard work={work} onSaveToggle={handleSaveToggle} />
              </div>
            ))}
          </div>
        )}

      </main>
      <Footer />
      </div>
    </div>
  );
}
