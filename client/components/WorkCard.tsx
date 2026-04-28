import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Bookmark, Flag, Pencil, Trash2 } from 'lucide-react';
import { supabase, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorks } from '@/lib/WorksContext';
import { useI18n } from '@/lib/i18n';
import AuthModal from '@/components/AuthModal';
import ReportModal from '@/components/ReportModal';
import EditWorkModal from '@/components/EditWorkModal';
import DeleteWorkModal from '@/components/DeleteWorkModal';

interface Props {
  work: Work;
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

export default function WorkCard({ work, onLikeToggle, onSaveToggle, isOwnProfile, onWorkChange, onWorkDeleted }: Props) {
  const { user } = useAuth();
  const { language: currentLang } = useI18n();
  const navigate = useNavigate();
  const worksContext = useWorks();
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Use context as source of truth
  const liked = worksContext.isLiked(work.id);
  const saved = worksContext.isSaved(work.id);
  const likeCount = worksContext.getLikeCount(work.id);

  const isSong = work.work_type === 'cancion';
  const isPoem = work.work_type === 'poema';
  const hasImage = !!(work.cover_url || work.file_url);

  // Format date according to language
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const yy = String(d.getFullYear()).slice(-2);
    return currentLang === 'es' ? `${dd}/${mm}/${yy}` : `${mm}/${dd}/${yy}`;
  };

  const isPendingLike = worksContext.isPendingLike(work.id);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { 
      setShowAuthModal(true);
      return;
    }

    if (isPendingLike) {
      console.debug('[WorkCard] Like request already pending');
      return;
    }

    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);

    await worksContext.toggleLike(work.id, user.id);
    onLikeToggle?.(work.id, worksContext.isLiked(work.id));
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { 
      setShowAuthModal(true);
      return;
    }

    if (worksContext.isPendingSave(work.id)) {
      console.debug('[WorkCard] Save request already pending');
      return;
    }

    await worksContext.toggleSave(work.id, user.id);
    onSaveToggle?.(work.id, worksContext.isSaved(work.id));
  };

  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { 
      setShowAuthModal(true);
      return;
    }
    setShowReportModal(true);
  };

  const linkPath = isSong ? `/song/${work.id}` : `/work/${work.id}`;

  return (
    <>
    <Link to={linkPath} state={{ from: 'gallery' }} className="group block">
      {/* Image/Media area */}
      <div className="relative overflow-hidden rounded-2xl glass-effect transition-all duration-300 ease-out transform will-change-transform group-hover:scale-[1.02] group-hover:shadow-xl bg-[hsl(var(--muted))]">

        {/* Save button — top right */}
        <button
          onClick={handleSave}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60"
          aria-label="Guardar"
        >
          <Bookmark
            className={`w-3.5 h-3.5 transition-all duration-200 ${saved ? 'fill-white stroke-white' : 'stroke-white'}`}
          />
        </button>

        {/* Media content */}
        {hasImage ? (
          <img
            src={work.cover_url ?? work.file_url ?? ''}
            alt={work.title}
            className={`w-full h-auto object-contain block transition-opacity duration-300 ease-out ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
        ) : isPoem ? (
          <div className="flex items-center justify-center min-h-48 w-full p-6">
            <p className="text-center text-[hsl(var(--foreground))] text-sm font-light whitespace-pre-line leading-relaxed line-clamp-6">
              &quot;{work.description}&quot;
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-40 text-4xl bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--muted))]">
            {WORK_TYPE_ICONS[work.work_type] ?? '🎨'}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-3 px-1">
        <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate leading-tight">{work.title}</p>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <Link
            to={`/u/${work.profiles?.username ?? ''}`}
            onClick={e => e.stopPropagation()}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors duration-200"
          >
            @{work.profiles?.username ?? work.profiles?.display_name ?? ''}
          </Link>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(work.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2 px-1 flex items-center justify-between gap-2">
        {isOwnProfile ? (
          <div className="flex gap-2 w-full">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEditModal(true);
              }}
              className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              title={currentLang === 'es' ? 'Editar' : 'Edit'}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
              title={currentLang === 'es' ? 'Eliminar' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Like button — subtle, premium */}
            <button
              onClick={handleLike}
              disabled={isPendingLike}
              className={`flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors ${isPendingLike ? 'opacity-50' : ''}`}
              aria-label="Me gusta"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-all duration-200 ${likeAnimating ? 'scale-125' : 'scale-100'} ${liked ? 'fill-current text-rose-500 stroke-rose-500' : ''}`}
              />
              {/* Only show count if > 0 — keeps feed clean */}
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Report button — opens modal, doesn't render dropdown */}
            <button
              onClick={handleReport}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
              aria-label={currentLang === 'es' ? 'Reportar' : 'Report'}
              title={currentLang === 'es' ? 'Reportar obra' : 'Report work'}
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

    </Link>

    {/* Modals OUTSIDE Link to prevent navigation interference */}
    <AuthModal
      isOpen={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      title={currentLang === 'es' ? 'Inicia sesión para continuar' : 'Sign in to continue'}
      description={currentLang === 'es' ? 'Necesitas una cuenta para hacer esto' : 'You need an account to do this'}
    />

    <ReportModal
      isOpen={showReportModal}
      onClose={() => setShowReportModal(false)}
      workId={work.id}
      userId={user?.id}
      onSuccess={() => {
        console.log('[WorkCard] Report sent successfully');
      }}
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
