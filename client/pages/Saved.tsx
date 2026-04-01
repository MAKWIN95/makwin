import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import { Loader2, Bookmark } from 'lucide-react';

export default function Saved() {
  const { user } = useAuth();
  const { language } = useI18n();
  const es = language === 'es';

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
            *,
            profiles!inner(id, username, display_name, avatar_url, verified)
          `)
          .in('id', workIds)
          .order('created_at', { ascending: false });

        if (!worksData) {
          setWorks([]);
          setLoading(false);
          return;
        }

        // Get likes count and liked_by_me for each work
        const worksWithCounts = await Promise.all(
          worksData.map(async (work: any) => {
            const { count: likeCount } = await supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('work_id', work.id);

            const { data: likedData } = await supabase
              .from('likes')
              .select('user_id')
              .eq('work_id', work.id)
              .eq('user_id', user.id)
              .maybeSingle();

            return {
              ...work,
              profiles: {
                ...work.profiles[0],
              },
              like_count: likeCount ?? 0,
              liked_by_me: !!likedData,
              saved_by_me: true,
            };
          })
        );

        setWorks(worksWithCounts as Work[]);
      } catch (err) {
        console.error('[Saved] Error loading works:', err);
        setWorks([]);
      }
      setLoading(false);
    };
    load();
  }, [user.id]);

  const handleSaveToggle = (workId: string, saved: boolean) => {
    if (!saved) setWorks(prev => prev.filter(w => w.id !== workId));
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
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
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
            {works.map(work => (
              <div key={work.id} className="inline-block w-full mb-4 break-inside-avoid">
                <WorkCard work={work} onSaveToggle={handleSaveToggle} />
              </div>
            ))}
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
