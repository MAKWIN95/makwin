import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase, Work, Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import ReportModal from '@/components/ReportModal';
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
  
  // Check if work data was passed via navigation state (from UploadWork)
  const initialWorkData = (location.state as any)?.work || null;
  
  const [work, setWork] = useState<Work | null>(initialWorkData as Work | null);
  const [author, setAuthor] = useState<Profile | null>(initialWorkData?.profiles as Profile | null);
  const [loading, setLoading] = useState(!initialWorkData);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(initialWorkData?.like_count || 0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const fetchWork = async () => {
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
        
        // Fetch work from Supabase with explicit all fields
        // Note: Don't filter by status here - let any work be viewable
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
            updated_at,
            profiles!user_id(id, username, display_name, avatar_url, bio, website, instagram_url, tiktok_url, is_verified, is_banned, language_preference)
          `)
          .eq('id', id)
          .single();

        if (workError || !workData) {
          // If work not found, retry up to 3 times with progressive delays (for newly uploaded works)
          if (retrying < 3) {
            const delays = [1500, 2500, 3500]; // Progressive delays
            setRetrying(retrying + 1);
            console.log(`[WorkDetail] Work not found, retrying (attempt ${retrying + 1}/3) with delay ${delays[retrying]}ms...`);
            setLoading(true);
            setTimeout(() => fetchWork(), delays[retrying]);
            return;
          }
          console.error('[WorkDetail] Work not found after 3 retries');
          setError('Obra no encontrada');
          setLoading(false);
          return;
        }

        console.log('[WorkDetail] Work loaded successfully:', workData.id);
        setWork(workData as unknown as Work);
        const profileData = Array.isArray(workData.profiles) ? workData.profiles[0] : workData.profiles;
        setAuthor(profileData as Profile);
        setLikeCount(workData.like_count || 0);

        // Check if user liked/saved this work
        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('work_id', id)
            .maybeSingle();

          const { data: saveData } = await supabase
            .from('saves')
            .select('id')
            .eq('user_id', user.id)
            .eq('work_id', id)
            .maybeSingle();

          setLiked(!!likeData);
          setSaved(!!saveData);
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

  const handleLike = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!work) return;

    try {
      if (liked) {
        // Unlike: Delete from likes table and decrement like_count
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('work_id', work.id);
        
        // Update works table to decrement like_count
        const newCount = Math.max(0, likeCount - 1);
        await supabase
          .from('works')
          .update({ like_count: newCount })
          .eq('id', work.id);
        
        setLiked(false);
        setLikeCount(newCount);
      } else {
        // Like: Insert into likes table and increment like_count
        await supabase
          .from('likes')
          .insert({ user_id: user.id, work_id: work.id });
        
        // Update works table to increment like_count
        const newCount = likeCount + 1;
        await supabase
          .from('works')
          .update({ like_count: newCount })
          .eq('id', work.id);
        
        setLiked(true);
        setLikeCount(newCount);
      }
    } catch (err) {
      console.error('[WorkDetail] Error toggling like:', err);
      // Show error or revert state
      setLiked(!liked);
      setLikeCount(liked ? likeCount + 1 : Math.max(0, likeCount - 1));
    }
  };

  const handleSave = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!work) return;

    try {
      if (saved) {
        // Unsave
        await supabase
          .from('saves')
          .delete()
          .eq('user_id', user.id)
          .eq('work_id', work.id);
        setSaved(false);
      } else {
        // Save
        await supabase
          .from('saves')
          .insert({ user_id: user.id, work_id: work.id });
        setSaved(true);
      }
    } catch (err) {
      console.error('[WorkDetail] Error toggling save:', err);
    }
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
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header hideSearch breadcrumb={work.title} />

      <main className="w-full max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => {
            // If we have a referrer from gallery, go back safely
            // Otherwise go to gallery
            const isFromGallery = location.state?.from === 'gallery' || document.referrer?.includes('/galeria');
            if (isFromGallery) {
              navigate(-1);
            } else {
              navigate('/galeria');
            }
          }}
          className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentLang === 'es' ? 'Atrás' : 'Back'}
        </button>

        {work.cover_url && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img src={work.cover_url} alt={work.title} className="w-full h-96 object-cover" />
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[hsl(var(--foreground))] mb-4">{work.title}</h1>

          {author && (
            <Link to={`/u/${author.username}`} className="flex items-center gap-3 mb-6 hover:opacity-80">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[hsl(var(--muted))] flex items-center justify-center">
                {author.avatar_url ? (
                  <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-medium">{author.display_name?.charAt(0) || author.username?.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">{author.display_name || author.username}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">@{author.username}</p>
              </div>
            </Link>
          )}

          {work.description && (
            <p className="text-[hsl(var(--muted-foreground))] mb-6 whitespace-pre-wrap">{work.description}</p>
          )}

          {work.hashtags && work.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {work.hashtags.map((tag) => (
                <span key={tag} className="text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Media */}
          {work.work_type === 'música' && work.file_url && (
            <div className="mb-8">
              <AudioPlayer src={work.file_url} />
            </div>
          )}

          {work.work_type === 'visual' && work.file_url && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img src={work.file_url} alt={work.title} className="w-full max-h-96 object-cover" />
            </div>
          )}

          {work.lyrics && work.work_type === 'música' && (
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">Letras</h2>
              <p className="text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">{work.lyrics}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleLike}
            disabled={!user}
            variant={liked ? 'default' : 'outline'}
            className="flex-1"
          >
            <Heart className={`w-4 h-4 mr-2 ${liked ? 'fill-current' : ''}`} />
            {likeCount}
          </Button>

          <Button
            onClick={handleSave}
            disabled={!user}
            variant={saved ? 'default' : 'outline'}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </Button>

          <Button onClick={handleReport} disabled={!user} variant="outline">
            <Flag className="w-4 h-4" />
          </Button>
        </div>

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
  );
}
