import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Bookmark, Flag, Pencil, Share2, Trash2 } from 'lucide-react';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorks } from '@/lib/WorksContext';
import { useI18n } from '@/lib/i18n';
import AuthModal from '@/components/AuthModal';
import ReportModal from '@/components/ReportModal';
import EditWorkModal from '@/components/EditWorkModal';
import DeleteWorkModal from '@/components/DeleteWorkModal';
import WorkOptionsMenu, { type WorkOption } from '@/components/WorkOptionsMenu';
import { shareWork } from '@/lib/shareWork';

interface Props {
  work: Work;
  priorityImage?: boolean;
  imageDimensions?: { width: number; height: number };
  onLikeToggle?: (workId: string, liked: boolean) => void;
  onSaveToggle?: (workId: string, saved: boolean) => void;
  isOwnProfile?: boolean;
  onWorkChange?: () => void;
  onWorkDeleted?: () => Promise<void>;
}

const WORK_TYPE_ICONS: Record<string, string> = {
  pintura: '🎨',
  fotografia: '📷',
  poema: '✍️',
  cancion: '🎵',
  video: '🎬',
};

export default function WorkCard({ work, priorityImage = false, imageDimensions, onLikeToggle, onSaveToggle, isOwnProfile, onWorkChange, onWorkDeleted }: Props) {
  const { user } = useAuth();
  const { language: currentLang } = useI18n();
  const navigate = useNavigate();
  const worksContext = useWorks();
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'like' | 'save' | 'report' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Use context as source of truth
  const liked = worksContext.isLiked(work.id);
  const saved = worksContext.isSaved(work.id);
  // Visitors have no interactions loaded, so the count comes with the work itself.
  const likeCount = worksContext.likeCounts[work.id] ?? (Number(work.like_count) || 0);

  const isSong = work.work_type === 'cancion';
  const isPoem = work.work_type === 'poema';
  const isImageWork = work.work_type === 'pintura' || work.work_type === 'fotografia';
  // A song, poem or video file is not an image: only its cover can be shown here.
  const hasImage = !!(work.cover_url || (isImageWork && work.file_url));

  const isPendingLike = worksContext.isPendingLike(work.id);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setAuthModalAction('like');
      setShowAuthModal(true);
      return;
    }

    if (isPendingLike) {
      console.debug('[WorkCard] Like request already pending');
      return;
    }

    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);

    const result = await worksContext.toggleLike(work.id, user.id);
    onLikeToggle?.(work.id, result.liked);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setAuthModalAction('save');
      setShowAuthModal(true);
      return;
    }

    if (worksContext.isPendingSave(work.id)) {
      console.debug('[WorkCard] Save request already pending');
      return;
    }

    setSaveAnimating(true);
    setTimeout(() => setSaveAnimating(false), 400);

    const nowSaved = await worksContext.toggleSave(work.id, user.id);
    onSaveToggle?.(work.id, nowSaved);
  };

  const handleReport = () => {
    if (!user) {
      setAuthModalAction('report');
      setShowAuthModal(true);
      return;
    }
    setShowReportModal(true);
  };

  const authModalTitle = currentLang === 'es'
    ? (authModalAction === 'like' ? 'Inicia sesión para dar like' : authModalAction === 'save' ? 'Inicia sesión para guardar' : authModalAction === 'report' ? 'Inicia sesión para reportar' : 'Inicia sesión para continuar')
    : (authModalAction === 'like' ? 'Sign in to like this work.' : authModalAction === 'save' ? 'Sign in to save works to your profile.' : authModalAction === 'report' ? 'Sign in to report a work.' : 'Sign in to continue');

  const authModalDescription = currentLang === 'es'
    ? (authModalAction === 'like' ? 'Necesitas una cuenta para activar el like.' : authModalAction === 'save' ? 'Necesitas una cuenta para guardar obras en tu perfil.' : authModalAction === 'report' ? 'Necesitas una cuenta para reportar esta obra.' : 'Necesitas una cuenta para hacer esto.')
    : (authModalAction === 'like' ? 'You need an account to like this work.' : authModalAction === 'save' ? 'You need an account to save works to your profile.' : authModalAction === 'report' ? 'You need an account to report a work.' : 'You need an account to do this.');

  const linkPath = `/work/${work.id}`;

  const es = currentLang === 'es';
  const optionIcon = 'w-4 h-4 shrink-0';
  const options: WorkOption[] = [
    { label: es ? 'Compartir' : 'Share', icon: <Share2 className={optionIcon} />, onSelect: () => shareWork(work, es) },
    ...(isOwnProfile
      ? [
          { label: es ? 'Editar' : 'Edit', icon: <Pencil className={optionIcon} />, onSelect: () => setShowEditModal(true) },
          { label: es ? 'Eliminar' : 'Delete', icon: <Trash2 className={optionIcon} />, onSelect: () => setShowDeleteModal(true) },
        ]
      : [{ label: es ? 'Denunciar' : 'Report', icon: <Flag className={optionIcon} />, onSelect: handleReport }]),
  ];

  return (
    <>
    {/* Links and buttons sit side by side, never one inside another: nested ones
        are invalid and make phones ignore or repeat taps. */}
    <div className="group relative z-0 block rounded-xl hover:z-20 focus-within:z-20">
      {/* Image/Media area */}
      <div className="relative rounded-2xl transition-shadow duration-300 ease-out group-hover:shadow-xl">

        {/* Options: no background, so it covers as little of the work as possible */}
        <WorkOptionsMenu
          label={es ? 'Opciones' : 'Options'}
          options={options}
          className={hasImage ? 'text-white [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.35))_drop-shadow(0_1px_3px_rgba(0,0,0,0.3))]' : 'text-[hsl(var(--muted-foreground))]'}
        />

        {/* Media content */}
        <Link to={linkPath} state={{ from: 'gallery' }} aria-label={work.title} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]">
        {hasImage ? (
          <img
            src={work.cover_url ?? work.file_url ?? ''}
            alt={work.title}
            width={imageDimensions?.width}
            height={imageDimensions?.height}
            className={`relative z-0 block h-auto w-full rounded-2xl object-contain transition-[transform,opacity] duration-300 ease-out group-hover:z-20 group-hover:scale-[1.014] group-focus-within:z-20 group-focus-within:scale-[1.014] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading={priorityImage ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
          />
        ) : isPoem ? (
          <div className="flex min-h-48 w-full items-center justify-center p-6">
            <p className="text-center text-[hsl(var(--foreground))] text-sm font-light whitespace-pre-line leading-relaxed line-clamp-6">
              &quot;{work.description}&quot;
            </p>
          </div>
        ) : (
          <div className="flex min-h-40 w-full items-center justify-center text-4xl bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--muted))]">
            {WORK_TYPE_ICONS[work.work_type] ?? '🎨'}
          </div>
        )}
        </Link>
      </div>

      <div className="relative z-30 transition-transform duration-300 ease-out group-hover:translate-y-0.5 group-focus-within:translate-y-0.5">
        {/* Title with the two quick actions, artist right under it */}
        <div className="mt-2 px-1">
          <div className="flex items-center justify-between gap-2">
            <Link to={linkPath} state={{ from: 'gallery' }} tabIndex={-1} className="block min-w-0">
              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate leading-tight">{work.title}</p>
            </Link>
            {/* On phones each button is finger-sized but only takes up the icon's
                height, and it grows downwards so it never catches a tap on the work. */}
            <div className="flex shrink-0 items-center gap-3 phone:gap-0 phone:-mr-2">
              <button
                onClick={handleLike}
                disabled={isPendingLike}
                className={`ios-press flex items-center gap-1 phone:h-11 phone:min-w-9 phone:justify-center phone:items-start phone:pt-1 phone:-mt-1 phone:-mb-[22px] text-xs transition-colors duration-200 ease-out ${liked ? 'text-rose-500' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                aria-label={es ? 'Me gusta' : 'Like'}
                aria-pressed={liked}
              >
                <Heart className={`w-3.5 h-3.5 phone:w-[18px] phone:h-[18px] ${likeAnimating ? 'icon-pop' : ''} ${liked ? 'fill-current stroke-current' : ''}`} />
                {/* Only show count if > 0 — keeps feed clean */}
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>
              <button
                onClick={handleSave}
                className={`ios-press flex items-center phone:h-11 phone:w-9 phone:justify-center phone:items-start phone:pt-1 phone:-mt-1 phone:-mb-[22px] transition-colors duration-200 ease-out ${saved ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                aria-label={es ? 'Guardar' : 'Save'}
                aria-pressed={saved}
              >
                <Bookmark className={`w-3.5 h-3.5 phone:w-[18px] phone:h-[18px] ${saveAnimating ? 'icon-pop' : ''} ${saved ? 'fill-current stroke-current' : ''}`} />
              </button>
            </div>
          </div>
          {work.profiles?.username ? (
            <Link
              to={`/u/${work.profiles.username}`}
              className="relative block w-fit max-w-full mt-0.5 leading-tight text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors duration-200 phone:after:absolute phone:after:inset-x-0 phone:after:top-0 phone:after:-bottom-2.5 phone:after:content-['']"
            >
              <span className="block truncate">@{work.profiles.username}</span>
            </Link>
          ) : (
            <span className="block mt-0.5 leading-tight truncate text-xs text-[hsl(var(--muted-foreground))]">{es ? 'Usuario no encontrado' : 'User not found'}</span>
          )}
        </div>
      </div>

    </div>

    {/* Modals OUTSIDE Link to prevent navigation interference */}
    <AuthModal
      isOpen={showAuthModal}
      onClose={() => {
        setShowAuthModal(false);
        setAuthModalAction(null);
      }}
      title={authModalTitle}
      description={authModalDescription}
    />

    <ReportModal
      isOpen={showReportModal}
      onClose={() => setShowReportModal(false)}
      workId={work.id}
      userId={user?.id}
    />

    <EditWorkModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      work={work}
      onSuccess={() => {
        onWorkChange?.();
      }}
    />

    <DeleteWorkModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      workId={work.id}
      workTitle={work.title}
      onSuccess={() => {
        onWorkChange?.();
      }}
    />
    </>
  );
}
