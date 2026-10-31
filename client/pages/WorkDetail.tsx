import { useParams, Link, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { supabase, Work, Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorks } from '@/lib/WorksContext';
import { useFollow } from '@/lib/FollowContext';
import { shareWork } from '@/lib/shareWork';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import ReportModal from '@/components/ReportModal';
import LikeBurst from '@/components/LikeBurst';
import WorkCarousel from '@/components/WorkCarousel';
import MoreFromArtist from '@/components/MoreFromArtist';
import EditWorkModal from '@/components/EditWorkModal';
import DeleteWorkModal from '@/components/DeleteWorkModal';
import { flyFrom, openingOf } from '@/lib/work-opening';
import { fitArtwork } from '@/lib/fit-artwork';
import { loadPoemFont, poemFontStyle } from '@/lib/poem-fonts';
import { useDoubleTap } from '@/hooks/use-double-tap';
import FollowButton from '@/components/FollowButton';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, Share2, Flag, Loader2, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const CHECK_POLL_MS = 2500;
const CHECK_GIVEN_UP_MS = 3 * 60 * 1000;

function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [el, setEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onDur = () => setDur(Number.isFinite(el.duration) ? el.duration : 0);
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
    };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onDur);
    el.addEventListener('durationchange', onDur);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onDur);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('ended', onEnded);
    };
  }, [el]);

  const toggle = () => {
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(err => {
        console.error('[AudioPlayer] Could not play:', err);
        setPlaying(false);
      });
    }
  };

  const seek = (v: number) => {
    if (!el) return;
    el.currentTime = v;
    setTime(v);
  };

  if (!src) return null;

  const clock = (seconds: number) => {
    const safe = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      <audio ref={setEl as any} src={src} />
      <div className="flex items-center gap-4 justify-center mb-3">
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="p-3 rounded-full bg-[hsl(var(--popover))] hover:bg-[hsl(var(--popover))/0.95]">
          {playing ? '■' : '▶'}
        </button>
        <div className="w-full max-w-xl">
          <input type="range" min={0} max={dur || 0} value={time} onChange={e => seek(Number(e.target.value))} className="w-full" />
          <div className="text-xs text-[hsl(var(--muted-foreground))] flex justify-between mt-1">
            <span>{clock(time)}</span>
            <span>{clock(dur)}</span>
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
  
  // A work opened from its card brings what the card knew, and shows at once.
  const initialWorkData = (location.state as any)?.work || null;
  
  const [work, setWork] = useState<Work | null>(initialWorkData as Work | null);
  const [author, setAuthor] = useState<Profile | null>(initialWorkData?.profiles as Profile | null);
  const [loading, setLoading] = useState(!initialWorkData);
  const navigationType = useNavigationType();
  const page = useRef<HTMLDivElement>(null);
  const [opening] = useState(() => (initialWorkData ? openingOf(id) : null));

  // Before the first paint: a new page starts at the top, and its work starts from where the card was.
  useLayoutEffect(() => {
    if (navigationType === 'PUSH') window.scrollTo(0, 0);
    const hero = page.current?.querySelector<HTMLElement>('[data-work-hero]');
    if (!opening || !hero) return;
    flyFrom(hero.querySelector<HTMLElement>('img, video') ?? hero, opening);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The stars' layer only exists once the work has loaded.
  useStarsBackground('detail-stars-background');

  const poemFontId = work?.poem_font;
  useEffect(() => {
    if (poemFontId) loadPoemFont(poemFontId);
  }, [poemFontId]);

  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'like' | 'save' | 'report' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recheck, setRecheck] = useState(0);

  // Use context as source of truth
  const liked = id ? worksContext.isLiked(id) : false;
  const saved = id ? worksContext.isSaved(id) : false;
  const likeCount = id ? worksContext.likeCounts[id] ?? (Number(work?.like_count) || 0) : 0;

  useEffect(() => {
    const fetchWork = async () => {
      if (!id) {
        setError(currentLang === 'es' ? 'No se ha indicado una obra.' : 'No work was specified.');
        setLoading(false);
        return;
      }

      // With the work on screen this only brings it up to date, out of sight.
      const onScreen = !!work;

      try {
        if (!onScreen) setLoading(true);
        setError('');
        
        // Fetch work from database only
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
            extra_images,
            poem_font,
            lyrics,
            hashtags,
            is_for_sale,
            price,
            status,
            policy_flags,
            like_count,
            view_count,
            language,
            created_at,
            updated_at
          `)
          .eq('id', id)
          .single();

        if (workError || !workData) {
          console.error('[WorkDetail] Work fetch error:', workError);
          
          // Retry only on real network errors, not bad queries
          if (onScreen && workError?.code !== 'PGRST116') return;
          if (retrying < 3 && workError?.code !== 'PGRST116') {
            const delays = [1500, 2500, 3500];
            setRetrying(retrying + 1);
            setTimeout(() => fetchWork(), delays[retrying]);
            return;
          }
          
          setError(currentLang === 'es' ? 'No se ha encontrado la obra.' : 'Work not found.');
          setLoading(false);
          return;
        }

        setWork(workData as unknown as Work);
        // Update context with like count
        worksContext.updateLikeCount(workData.id, workData.like_count || 0);
        // The work is shown now; its artist and your like arrive when they arrive.
        setLoading(false);

        const [{ data: profileData, error: profileError }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, bio, website, instagram_url, tiktok_url, is_verified, is_banned')
            .eq('id', workData.user_id)
            .single(),
          // Check if user liked/saved this work (load into context)
          user
            ? worksContext.loadUserInteractions([workData.id], user.id, { [workData.id]: Number(workData.like_count) || 0 })
            : Promise.resolve(),
        ]);

        if (!profileError && profileData) {
          setAuthor(profileData as Profile);
        } else {
          console.warn('[WorkDetail] Profile fetch failed:', profileError);
        }
      } catch (err: any) {
        console.error('[WorkDetail] Error:', err);
        if (!onScreen) setError(currentLang === 'es' ? 'No se pudo cargar la obra. Inténtalo de nuevo.' : 'The work could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [id, user, recheck]);

  // While its check runs, the author sees it finish without reloading.
  const isChecking = !!work && user?.id === work.user_id && !!work.policy_flags?.includes('checking');
  useEffect(() => {
    if (!isChecking || Date.now() - Date.parse(work?.updated_at ?? '') > CHECK_GIVEN_UP_MS) return;
    const timer = setTimeout(() => setRecheck((count) => count + 1), CHECK_POLL_MS);
    return () => clearTimeout(timer);
  }, [isChecking, recheck]);

  // Follow state is already loaded by FollowContext, no need to check again
  // The isFollowing(author.id) call below will use the global context state

  const isPendingLike = id ? worksContext.isPendingLike(id) : false;
  const isPendingSave = id ? worksContext.isPendingSave(id) : false;

  const handleLike = async () => {
    if (!user) {
      setAuthModalAction('like');
      setShowAuthModal(true);
      return;
    }
    if (!work || isPendingLike) return;

    await worksContext.toggleLike(work.id, user.id);
  };

  const [likeBursts, setLikeBursts] = useState(0);
  const handleImageTap = useDoubleTap(() => {
    if (user) setLikeBursts((count) => count + 1);
    if (!user || !liked) handleLike();
  });

  const handleSave = async () => {
    if (!user) {
      setAuthModalAction('save');
      setShowAuthModal(true);
      return;
    }
    if (!work || isPendingSave) return;

    await worksContext.toggleSave(work.id, user.id);
  };

  const handleReport = () => {
    if (!user) {
      setAuthModalAction('report');
      setShowAuthModal(true);
      return;
    }
    if (!work) return;
    setShowReportModal(true);
  };

  const workDate = work?.created_at
    ? new Date(work.created_at).toLocaleDateString(currentLang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const authModalTitle = currentLang === 'es'
    ? (authModalAction === 'like' ? 'Inicia sesión para dar like' : authModalAction === 'save' ? 'Inicia sesión para guardar' : authModalAction === 'report' ? 'Inicia sesión para reportar' : 'Inicia sesión para continuar')
    : (authModalAction === 'like' ? 'Sign in to like this work.' : authModalAction === 'save' ? 'Sign in to save works to your profile.' : authModalAction === 'report' ? 'Sign in to report a work.' : 'Sign in to continue');

  const authModalDescription = currentLang === 'es'
    ? (authModalAction === 'like' ? 'Necesitas una cuenta para activar el like.' : authModalAction === 'save' ? 'Necesitas una cuenta para guardar obras en tu perfil.' : authModalAction === 'report' ? 'Necesitas una cuenta para reportar esta obra.' : 'Necesitas una cuenta para hacer esto.')
    : (authModalAction === 'like' ? 'You need an account to like this work.' : authModalAction === 'save' ? 'You need an account to save works to your profile.' : authModalAction === 'report' ? 'You need an account to report a work.' : 'You need an account to do this.');

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
          <p className="text-[hsl(var(--muted-foreground))]">{error || (currentLang === 'es' ? 'No se ha encontrado la obra.' : 'Work not found.')}</p>
          <Button onClick={() => navigate('/galeria')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentLang === 'es' ? 'Volver a la galería' : 'Back to the gallery'}
          </Button>
        </div>
      </div>
    );
  }

  const es = currentLang === 'es';
  const isMine = !!user && user.id === work.user_id;
  const takenDown = work.status === 'removed_policy' && !work.policy_flags?.includes('pending_review');
  const restClass = opening ? 'work-open-rest' : '';
  const carouselImages = work.file_url ? [work.file_url, ...(work.extra_images ?? [])] : [];

  return (
    <div ref={page} className="relative w-full min-h-screen bg-[hsl(var(--background))]">
      {/* STARS BACKGROUND */}
      <div id="detail-stars-background" className="fixed inset-0 z-0 stars-background pointer-events-none" />
      {/* CONTENIDO */}
      <div className={`relative z-20 ${opening ? '' : 'page-enter'}`}>
      <Header hideSearch breadcrumb={work.title} />

      <main className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* LEFT: Media (60%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Image/Cover */}
            {work.cover_url && (
              <div data-work-hero className="flex items-start justify-center lg:pt-12 lg:min-h-[50vh]">
                <img ref={fitArtwork} src={work.cover_url} alt={work.title} decoding="sync" onClick={handleImageTap} className="touch-manipulation select-none rounded-lg border border-[rgba(255,255,255,0.1)] max-h-[var(--art-room)] max-w-full w-auto h-auto object-contain" />
              </div>
            )}

            {/* Audio - Canción/Poema */}
            {(work.work_type === 'cancion' || work.work_type === 'poema') && work.file_url && (
              <AudioPlayer src={work.file_url} />
            )}

            {/* Video */}
            {work.work_type === 'video' && work.file_url && (
              <div data-work-hero={work.cover_url ? undefined : ''} className="flex items-center justify-center lg:min-h-[80vh]">
                <video src={work.file_url} controls controlsList="nodownload" disablePictureInPicture playsInline className="rounded-lg border border-[rgba(255,255,255,0.1)] max-h-[var(--art-room)] max-w-full w-auto object-contain" />
              </div>
            )}

            {/* Pintura/Fotografia secondary image */}
            {(work.work_type === 'pintura' || work.work_type === 'fotografia') && work.file_url && !!work.extra_images?.length && (
              <div data-work-hero={work.cover_url ? undefined : ''}>
                <WorkCarousel key={carouselImages.join('|')} images={carouselImages} alt={work.title} onImageClick={handleImageTap} />
              </div>
            )}

            {(work.work_type === 'pintura' || work.work_type === 'fotografia') && work.file_url && !work.extra_images?.length && work.file_url !== work.cover_url && (
              <div data-work-hero={work.cover_url ? undefined : ''} className="flex items-center justify-center lg:min-h-[80vh]">
                <img ref={fitArtwork} src={work.file_url} alt={work.title} decoding="sync" onClick={handleImageTap} className="touch-manipulation select-none rounded-lg border border-[rgba(255,255,255,0.1)] max-h-[var(--art-room)] max-w-full w-auto h-auto object-contain" />
              </div>
            )}

            {/* A poem is its text: show it where the media would be */}
            {work.work_type === 'poema' && work.description && (
              <div data-work-hero={work.cover_url ? undefined : ''} className="relative flex items-center justify-center rounded-xl border border-[rgba(120,120,120,0.25)] bg-[hsl(var(--background))] p-8 sm:p-14 min-h-[40vh]">
                <p data-poem-text style={poemFontStyle(work.poem_font, 1.2)} className="whitespace-pre-wrap text-center leading-relaxed text-[hsl(var(--foreground))]">{work.description}</p>
              </div>
            )}

            {/* Fallback if no media */}
            {!work.cover_url && !work.file_url && work.work_type !== 'poema' && (
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--muted))]  flex items-center justify-center" style={{ height: '500px' }}>
                <div className="flex flex-col items-center gap-3">
                  <span className="text-6xl">🎨</span>
                  <p className="text-[hsl(var(--muted-foreground))] text-sm">{currentLang === 'es' ? 'Sin media' : 'No media'}</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Info (40%) */}
          <div className={`lg:col-span-1 space-y-6 ${restClass}`}>
            {isMine && work.status && work.status !== 'published' && (
              <p role="status" className="rounded-lg border border-[rgba(120,120,120,0.25)] px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]">
                {takenDown
                  ? (es ? 'El equipo ha retirado esta obra. Solo la ves tú.' : 'The team has taken this work down. Only you can see it.')
                  : isChecking
                    ? (es ? 'Estamos comprobando esta obra. Se publicará en unos segundos si todo está bien.' : 'We are checking this work. It will be published in a few seconds if all is well.')
                    : (es ? 'Esta obra está en revisión. Solo la ves tú hasta que la revisemos.' : 'This work is in review. Only you can see it until we have reviewed it.')}
              </p>
            )}
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] leading-tight">{work.title}</h1>
              {workDate && <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{workDate}</p>}
            </div>

            {work.description && work.work_type !== 'poema' && (
              <p className="text-[hsl(var(--muted-foreground))] text-base leading-relaxed whitespace-pre-wrap">{work.description}</p>
            )}

            {author && (
              <div className="border-t border-b border-[rgba(120,120,120,0.25)] py-4">
                <div className="flex items-center justify-between gap-4">
                  <Link to={`/u/${author.username}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity duration-250 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[hsl(var(--muted))] flex-shrink-0">
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
                {work.hashtags.map((tag) => {
                  const cleaned = String(tag || '').replace(/^#/, '').trim();
                  if (!cleaned) return null;
                  return (
                    <Link
                      key={tag}
                      to={`/galeria?search=${encodeURIComponent(cleaned)}`}
                      className="phone:py-2.5 text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 px-3 py-1 rounded-full transition-all duration-200 ease-out cursor-pointer"
                    >
                      #{cleaned}
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 pt-4">
              <Button
                onClick={handleLike}
                disabled={isPendingLike}
                variant={liked ? 'default' : 'outline'}
                className="w-full transition-all duration-250 ease-out"
              >
                <Heart className={`w-4 h-4 mr-2 transition-all duration-200 ${liked ? 'fill-current' : ''}`} />
                {likeCount}
              </Button>

              <Button
                onClick={handleSave}
                disabled={isPendingSave}
                variant={saved ? 'default' : 'outline'}
                className="w-full transition-all duration-250 ease-out"
              >
                <Bookmark className={`w-4 h-4 mr-2 transition-all duration-200 ${saved ? 'fill-current' : ''}`} />
                {currentLang === 'es' ? 'Guardar' : 'Save'}
              </Button>

              <Button onClick={() => shareWork(work, currentLang === 'es')} variant="outline" className="w-full transition-all duration-250 ease-out">
                <Share2 className="w-4 h-4 mr-2" />
                {currentLang === 'es' ? 'Compartir' : 'Share'}
              </Button>

              {isMine ? (
                <>
                  {!takenDown && (
                    <Button onClick={() => setShowEditModal(true)} variant="outline" className="w-full transition-all duration-250 ease-out">
                      <Pencil className="w-4 h-4 mr-2" />
                      {es ? 'Editar' : 'Edit'}
                    </Button>
                  )}
                  <Button onClick={() => setShowDeleteModal(true)} variant="outline" className="w-full transition-all duration-250 ease-out text-red-500 hover:text-red-500">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {es ? 'Eliminar' : 'Delete'}
                  </Button>
                </>
              ) : (
                <Button onClick={handleReport} variant="outline" className="w-full transition-all duration-250 ease-out">
                  <Flag className="w-4 h-4 mr-2" />
                  {es ? 'Reportar' : 'Report'}
                </Button>
              )}
            </div>

            {author && <MoreFromArtist author={author} artistId={work.user_id} workId={work.id} isMine={isMine} />}
          </div>
        </div>

        {work.lyrics && work.work_type === 'cancion' && (
          <div className="mt-12 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">{currentLang === 'es' ? 'Letra' : 'Lyrics'}</h2>
            <p className="text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">{work.lyrics}</p>
          </div>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setAuthModalAction(null);
          }}
          title={authModalTitle}
          description={authModalDescription}
        />

        <LikeBurst count={likeBursts} className="fixed" />

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          workId={work?.id || ''}
          userId={user?.id}
        />

        {isMine && (
          <>
            <EditWorkModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              work={work}
              onSuccess={(saved) => setWork((current) => ({ ...current, ...saved }))}
            />
            <DeleteWorkModal
              isOpen={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
              workId={work.id}
              workTitle={work.title}
              onSuccess={() => {
                document.dispatchEvent(new CustomEvent('workDeleted', { detail: work.id }));
                navigate(author ? `/u/${author.username}` : '/galeria', { replace: true });
              }}
            />
          </>
        )}
      </main>
      <Footer />
      </div>
    </div>
  );
}
