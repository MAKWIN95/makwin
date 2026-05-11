import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, Work, Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorks } from '@/lib/WorksContext';
import { useFollow } from '@/lib/FollowContext';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import ReportModal from '@/components/ReportModal';
import FollowButton from '@/components/FollowButton';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, Share2, Flag, Loader2, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [el, setEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onDur = () => setDur(el.duration || 0);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onDur);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onDur);
    };
  }, [el]);

  const toggle = () => {
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  };

  const seek = (v: number) => {
    if (!el) return;
    el.currentTime = v;
    setTime(v);
  };

  if (!src) return null;

  return (
    <div className="w-full">
      <audio ref={setEl as any} src={src} />
      <div className="flex items-center gap-4 justify-center mb-3">
        <button onClick={toggle} className="p-3 rounded-full bg-[hsl(var(--popover))] hover:bg-[hsl(var(--popover))/0.95]">
          {playing ? '■' : '▶'}
        </button>
        <div className="w-full max-w-xl">
          <input type="range" min={0} max={dur || 0} value={time} onChange={e => seek(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] flex justify-between mt-1">
            <span>{new Date((time || 0) * 1000).toISOString().substr(14, 5)}</span>
            <span>{new Date((dur || 0) * 1000).toISOString().substr(14, 5)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language: currentLang, t } = useI18n();
  const worksContext = useWorks();
  const { isFollowing, setFollowing } = useFollow();
  
  // Initialize stars background animation
  useStarsBackground('detail-stars-background');
  
  // Check if work data was passed via navigation state (from UploadWork)
  const initialWorkData = (location.state as any)?.work || null;
  
  const [work, setWork] = useState<Work | null>(initialWorkData as Work | null);
  const [author, setAuthor] = useState<Profile | null>(initialWorkData?.profiles as Profile | null);
  const [loading, setLoading] = useState(!initialWorkData);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Use context as source of truth
  const liked = id ? worksContext.isLiked(id) : false;
  const saved = id ? worksContext.isSaved(id) : false;
  const likeCount = id ? worksContext.getLikeCount(id) : 0;

  useEffect(() => {
    const fetchWork = async () => {
      console.log('[WorkDetail] ID from route params:', id, typeof id);
      console.log('[WorkDetail] initialWorkData:', initialWorkData);
      
      if (!id) {
        setError('No work ID provided');
        setLoading(false);
        return;
      }

      // If we already have work data from state, skip initial fetch but still sync
      if (initialWorkData && !loading) {
        console.log('[WorkDetail] Using work data from navigation state, work ID:', initialWorkData.id);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        // Fetch work from database only
        console.log('[WorkDetail] Fetching work with ID:', id, 'Type:', typeof id);
        const { data: workData, error: workError } = await supabase
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
            updated_at
          `)
          .eq('id', id)
          .single();

        console.log('[WorkDetail] Supabase response - workData:', workData, 'workError:', workError);
        
        if (workError || !workData) {
          console.error('[WorkDetail] Work fetch error:', workError);
          
          // Retry only on real network errors, not bad queries
          if (retrying < 3 && workError?.code !== 'PGRST116') {
            const delays = [1500, 2500, 3500];
            setRetrying(retrying + 1);
            console.log(`[WorkDetail] Retrying (attempt ${retrying + 1}/3) with delay ${delays[retrying]}ms...`);
            setTimeout(() => fetchWork(), delays[retrying]);
            return;
          }
          
          setError('Obra no encontrada');
          setLoading(false);
          return;
        }

        console.log('[WorkDetail] Work loaded:', workData.id);
        setWork(workData as unknown as Work);
        // Update context with like count
        worksContext.updateLikeCount(workData.id, workData.like_count || 0);

        // ISSUE 1 FIX: Fetch profile SEPARATELY in a second query
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, website, instagram_url, tiktok_url, is_verified, is_banned')
          .eq('id', workData.user_id)
          .single();

        if (!profileError && profileData) {
          setAuthor(profileData as Profile);
          console.log('[WorkDetail] Profile loaded:', profileData.id);
        } else {
          console.warn('[WorkDetail] Profile fetch failed:', profileError);
        }

        // Check if user liked/saved this work (load into context)
        if (user && workData.id) {
          await worksContext.loadUserInteractions([workData.id], user.id);
        }
      } catch (err: any) {
        console.error('[WorkDetail] Error:', err);
        setError(err?.message || 'Error al cargar la obra');
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [id, user]);

  // Follow state is already loaded by FollowContext, no need to check again
  // The isFollowing(author.id) call below will use the global context state

  const isPendingLike = id ? worksContext.isPendingLike(id) : false;
  const isPendingSave = id ? worksContext.isPendingSave(id) : false;

  const handleLike = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!work || isPendingLike) return;

    await worksContext.toggleLike(work.id, user.id);
  };

  const handleSave = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!work || isPendingSave) return;

    await worksContext.toggleSave(work.id, user.id);
  };

  const handleReport = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!work) return;
    setShowReportModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Header hideSearch />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <Header hideSearch />
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-[hsl(var(--muted-foreground))]">{error || 'Obra no encontrada'}</p>
          <Button onClick={() => navigate('/galeria')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a la galería
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[hsl(var(--background))]">
      {/* STARS BACKGROUND */}
      <div id="detail-stars-background" className="fixed inset-0 z-0 stars-background pointer-events-none" />
      {/* CONTENIDO */}
      <div className="relative z-20">
      <Header hideSearch breadcrumb={work.title} />

      <main className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentLang === 'es' ? 'Atrás' : 'Back'}
        </button>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* LEFT: Media (60%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Image/Cover */}
            {work.cover_url && (
              <div className="flex items-start justify-center pt-12" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: '50vh' }}>
                <img src={work.cover_url} alt={work.title} className="rounded-lg border border-[rgba(255,255,255,0.1)] max-h-80vh w-auto h-auto object-contain" loading="lazy" />
              </div>
            )}

            {/* Audio - Canción/Poema */}
            {(work.work_type === 'cancion' || work.work_type === 'poema') && work.file_url && (
              <AudioPlayer src={work.file_url} />
            )}

            {/* Video */}
            {work.work_type === 'video' && work.file_url && (
              <div className="flex items-center justify-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <video src={work.file_url} controls className="rounded-lg border border-[rgba(255,255,255,0.1)] max-h-80vh w-auto object-contain" />
              </div>
            )}

            {/* Pintura/Fotografia secondary image */}
            {(work.work_type === 'pintura' || work.work_type === 'fotografia') && work.file_url && (
              <div className="flex items-center justify-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <img src={work.file_url} alt={work.title} className="rounded-lg border border-[rgba(255,255,255,0.1)] max-h-80vh w-auto h-auto object-contain" loading="lazy" />
              </div>
            )}

            {/* Fallback if no media */}
            {!work.cover_url && !work.file_url && (
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--muted))]  flex items-center justify-center" style={{ height: '500px' }}>
                <div className="flex flex-col items-center gap-3">
                  <span className="text-6xl">🎨</span>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm">{currentLang === 'es' ? 'Sin media' : 'No media'}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Info (40%) */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] leading-tight">{work.title}</h1>
            </div>

            {work.description && (
              <p className="text-[hsl(var(--muted-foreground))] text-base leading-relaxed whitespace-pre-wrap">{work.description}</p>
            )}

            {author && (
              <div className="border-t border-b border-[rgba(120,120,120,0.25)] py-4">
                <div className="flex items-center justify-between gap-4">
                  <Link to={`/u/${author.username}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity duration-250 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[hsl(var(--muted))] flex-shrink-0">
                      {author.avatar_url ? (
                        <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium flex items-center justify-center w-full h-full">{author.display_name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[hsl(var(--foreground))] truncate">{author.display_name || author.username}</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">@{author.username}</p>
                    </div>
                  </Link>
                  {user && user.id !== author.id && (
                    <FollowButton
                      userId={author.id}
                      isFollowing={isFollowing(author.id)}
                      onFollowChange={() => {}}
                      size="sm"
                    />
                  )}
                </div>
              </div>
            )}

            {work.hashtags && work.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {work.hashtags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/galeria?search=%23${encodeURIComponent(tag)}`}
                    className="text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 px-3 py-1 rounded-full transition-all duration-200 ease-out cursor-pointer"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-4">
              <Button
                onClick={handleLike}
                disabled={!user || isPendingLike}
                variant={liked ? 'default' : 'outline'}
                className="w-full transition-all duration-250 ease-out"
              >
                <Heart className={`w-4 h-4 mr-2 transition-all duration-200 ${liked ? 'fill-current' : ''}`} />
                {likeCount}
              </Button>

              <Button
                onClick={handleSave}
                disabled={!user || isPendingSave}
                variant={saved ? 'default' : 'outline'}
                className="w-full transition-all duration-250 ease-out"
              >
                <Bookmark className={`w-4 h-4 mr-2 transition-all duration-200 ${saved ? 'fill-current' : ''}`} />
                {currentLang === 'es' ? 'Guardar' : 'Save'}
              </Button>

              <Button onClick={handleReport} disabled={!user} variant="outline" className="w-full transition-all duration-250 ease-out">
                <Flag className="w-4 h-4 mr-2" />
                {currentLang === 'es' ? 'Reportar' : 'Report'}
              </Button>
            </div>
          </div>
        </div>

        {work.lyrics && work.work_type === 'cancion' && (
          <div className="mt-12 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">Letras</h2>
            <p className="text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">{work.lyrics}</p>
          </div>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title={currentLang === 'es' ? 'Inicia sesión para continuar' : 'Sign in to continue'}
          description={currentLang === 'es' ? 'Necesitas una cuenta para hacer esto' : 'You need an account to do this'}
        />

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          workId={work?.id || ''}
          userId={user?.id}
          onSuccess={() => {
            console.log('[WorkDetail] Report sent successfully');
          }}
        />
      </main>
      </div>
    </div>
  );
}
