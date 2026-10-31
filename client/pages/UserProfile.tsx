import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, Profile, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useFollow } from '@/lib/FollowContext';
import { useI18n } from '@/lib/i18n';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { isValidUsername, normalizeUsername } from '@shared/username';
import { toast } from 'sonner';
import { useStarsBackground } from '@/hooks/use-stars-background';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import MasonryGrid, { type MasonryColumns } from '@/components/MasonryGrid';
import FollowersModal from '@/components/FollowersModal';
import { Camera, Check, X, ExternalLink, Loader2 } from 'lucide-react';

const GRID_COLUMNS: MasonryColumns = { base: 2, sm: 3, lg: 4 };
const MAX_AVATAR_MB = 5;

// Links typed by people must only ever open as web pages.
const safeExternalUrl = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

const CHECK_POLL_MS = 2500;
const CHECK_GIVEN_UP_MS = 3 * 60 * 1000;

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile, updateProfile, refreshProfile } = useAuth();
  const { isFollowing: isFollowingUser, setFollowing } = useFollow();
  const { language } = useI18n();
  
  // Initialize stars background animation
  useStarsBackground('profile-stars-background');
  const navigate = useNavigate();
  const es = language === 'es';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', display_name: '', bio: '', website: '', instagram_url: '', tiktok_url: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState<'followers' | 'following' | null>(null);

  const isOwnProfile = !!profile && myProfile?.id === profile.id;
  const isFollowing = !!profile && isFollowingUser(profile.id);
  const websiteUrl = safeExternalUrl(profile?.website);
  const instagramUrl = safeExternalUrl(profile?.instagram_url);
  const tiktokUrl = safeExternalUrl(profile?.tiktok_url);

  // Validate URLs don't contain banned content
  const validateURL = (url: string): boolean => {
    if (!url) return true;
    const bannedKeywords = ['gore', 'porn', '+18', '18+', 'xxx', 'adult', 'nsfw'];
    return !bannedKeywords.some(keyword => url.toLowerCase().includes(keyword));
  };

  useEffect(() => {
    if (!username) return;
    loadProfile();
  }, [username, user?.id]);

  // Refreshing after an edit keeps the page on screen instead of flashing a spinner.
  // A work being checked comes back on its own, with no need to reload the page.
  useEffect(() => {
    const beingChecked = works.some((work) => work.policy_flags?.includes('checking') && Date.now() - Date.parse(work.updated_at) < CHECK_GIVEN_UP_MS);
    if (!beingChecked) return;
    const timer = setTimeout(() => loadProfile(true), CHECK_POLL_MS);
    return () => clearTimeout(timer);
  }, [works]);

  // Who is looking is only known a moment after loading, so this runs twice: the
  // first answer must not replace the second, or your own held works would vanish.
  const latestLoad = useRef(0);
  const loadProfile = async (silent = false) => {
    const load = ++latestLoad.current;
    if (!silent) setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username!)
      .single();

    if (load !== latestLoad.current) return;
    if (!profileData) { setProfile(null); setLoading(false); return; }
    setProfile(profileData as Profile);
    setEditForm({ 
      username: profileData.username ?? '', 
      display_name: profileData.display_name ?? '', 
      bio: profileData.bio ?? '', 
      website: profileData.website ?? '',
      instagram_url: profileData.instagram_url ?? '',
      tiktok_url: profileData.tiktok_url ?? ''
    });

    // Works - fetch published works only
    const { data: worksData } = await supabase
      .from('works')
      .select('*')
      .eq('user_id', profileData.id)
      // Your own works can be seen and changed while they wait for review.
      .in('status', user?.id === profileData.id ? ['published', 'removed_policy'] : ['published'])
      .order('created_at', { ascending: false });
    if (load !== latestLoad.current) return;
    
    // Map profile data to each work
    const worksWithProfile = (worksData ?? []).map(work => ({
      ...work,
      profiles: {
        id: profileData.id,
        username: profileData.username,
        display_name: profileData.display_name,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        website: profileData.website,
        instagram_url: profileData.instagram_url,
        tiktok_url: profileData.tiktok_url,
        is_verified: profileData.is_verified,
        is_banned: profileData.is_banned,
        language_preference: profileData.language_preference,
        created_at: profileData.created_at,
        last_name_change: profileData.last_name_change,
        last_username_change: profileData.last_username_change,
      }
    }));
    
    setWorks((worksWithProfile ?? []) as Work[]);

    // Follow counts
    const [{ count: fwrCount }, { count: fwgCount }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
    ]);
    if (load !== latestLoad.current) return;
    setFollowerCount(fwrCount ?? 0);
    setFollowingCount(fwgCount ?? 0);

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user || !profile) { navigate('/login'); return; }
    const next = !isFollowing;
    try {
      await setFollowing(profile.id, next);
      setFollowerCount(c => Math.max(c + (next ? 1 : -1), 0));
    } catch {
      toast.error(es ? 'No se pudo actualizar. Inténtalo de nuevo.' : 'Could not update. Please try again.');
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setEditError('');

    const newUsernameValue = normalizeUsername(editForm.username);
    if (!isValidUsername(newUsernameValue)) {
      setEditError(getAuthErrorMessage('invalid_username', language));
      setSaving(false);
      return;
    }

    if (!editForm.display_name.trim()) {
      setEditError(es ? 'Escribe tu nombre visible.' : 'Please enter your display name.');
      setSaving(false);
      return;
    }

    const links = [editForm.website, editForm.instagram_url, editForm.tiktok_url];
    if (links.some(link => link.trim() && !safeExternalUrl(link))) {
      setEditError(es ? 'Revisa los enlaces: alguno no es una dirección web válida.' : 'Please check the links: one of them is not a valid web address.');
      setSaving(false);
      return;
    }

    // Validate URLs don't contain banned content
    if (!validateURL(editForm.website) || !validateURL(editForm.instagram_url) || !validateURL(editForm.tiktok_url)) {
      setEditError(es 
        ? 'Una o más URLs contienen contenido no permitido'
        : 'One or more URLs contain restricted content');
      setSaving(false);
      return;
    }

    // Check change limits
    if (profile?.display_name !== editForm.display_name && profile?.last_name_change) {
      const lastChange = new Date(profile.last_name_change);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      if (lastChange > twoDaysAgo) {
        const daysRemaining = Math.ceil((lastChange.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + 2;
        setEditError(es 
          ? `Puedes cambiar tu nombre nuevamente en ${daysRemaining} día(s)`
          : `You can change your name again in ${daysRemaining} day(s)`);
        setSaving(false);
        return;
      }
    }

    if (profile?.username !== editForm.username && profile?.last_username_change) {
      const lastChange = new Date(profile.last_username_change);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (lastChange > thirtyDaysAgo) {
        const daysRemaining = Math.ceil((lastChange.getTime() - Date.now() + 30 * 24 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24));
        setEditError(es 
          ? `Puedes cambiar tu nombre de usuario en ${daysRemaining} día(s)`
          : `You can change your username in ${daysRemaining} day(s)`);
        setSaving(false);
        return;
      }
    }

    // Store old username to detect changes
    const oldUsername = profile?.username;
    const newUsername = newUsernameValue;

    const { error } = await updateProfile({ ...editForm, username: newUsername, display_name: editForm.display_name.trim() });
    setSaving(false);
    if (error) { setEditError(getAuthErrorMessage(error, language)); return; }
    await refreshProfile();
    setEditing(false);
    toast.success(es ? 'Perfil actualizado' : 'Profile updated');

    // If username changed, redirect to new profile URL
    if (oldUsername !== newUsername) {
      navigate(`/u/${newUsername}`, { replace: true });
      return;
    }

    loadProfile(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    
    // Block GIFs
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'gif') {
      toast.error(es ? 'Los GIFs no están permitidos en el avatar. Solo PNG, JPG o WebP.' : 'GIFs are not allowed. Only PNG, JPG, or WebP.');
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(es ? `La imagen no puede superar ${MAX_AVATAR_MB} MB.` : `The image cannot exceed ${MAX_AVATAR_MB} MB.`);
      return;
    }
    
    setAvatarUploading(true);
    const path = `${user.id}/avatar.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    
    if (uploadError) {
      console.error('[Avatar] Upload failed:', uploadError);
      toast.error(es ? 'No se pudo subir la imagen. Inténtalo de nuevo.' : 'The image could not be uploaded. Please try again.');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: profileError } = await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
      if (profileError) {
        toast.error(getAuthErrorMessage(profileError, language));
      } else {
        await refreshProfile();
        await loadProfile(true);
        toast.success(es ? 'Foto actualizada' : 'Photo updated');
      }
    }
    setAvatarUploading(false);
    e.target.value = '';
  };

  if (loading) return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <Header hideSearch />
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-[hsl(var(--foreground))] mb-4">{es ? 'Usuario no encontrado' : 'User not found'}</p>
          <Link to="/galeria" className="tap-area text-sm underline text-[hsl(var(--muted-foreground))]">← {es ? 'Volver a la galería' : 'Back to the gallery'}</Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="profile-stars-background" className="stars-background" />
      <div className="relative z-10">
      <Header showSearchCentered />

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 page-enter">

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))]">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.display_name ?? profile.username} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-light text-[hsl(var(--muted-foreground))]">
                    {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
                  </div>
              }
            </div>
            {isOwnProfile && (
              <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                {avatarUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleAvatarChange} className="hidden" aria-label={es ? 'Cambiar foto de perfil' : 'Change profile photo'} />
              </label>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="space-y-3 max-w-sm">
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1 block">
                    {es ? 'Nombre de usuario' : 'Username'}
                  </label>
                  <div className="flex items-center border border-[hsl(var(--border))] rounded-lg overflow-hidden bg-[hsl(var(--input))]">
                    <span className="px-3 py-2 text-sm text-[hsl(var(--muted-foreground))] font-medium">@</span>
                    <input value={editForm.username} onChange={e => setEditForm(p => ({ ...p, username: e.target.value.toLowerCase() }))}
                      placeholder={es ? 'tu_usuario' : 'your_username'}
                      className="flex-1 px-0 py-2 bg-transparent text-sm border-0 focus:outline-none" />
                  </div>
                </div>
                <input value={editForm.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder={es ? 'Nombre visible' : 'Display name'}
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm" />
                <textarea value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder={es ? 'Bio (opcional)' : 'Bio (optional)'} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm resize-none" />
                <input value={editForm.website} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))}
                  placeholder={es ? 'Tu web (https://...)' : 'Your website (https://...)'} type="url"
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm" />
                <input value={editForm.instagram_url} onChange={e => setEditForm(p => ({ ...p, instagram_url: e.target.value }))}
                  placeholder="https://instagram.com/..." type="url"
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm" />
                <input value={editForm.tiktok_url} onChange={e => setEditForm(p => ({ ...p, tiktok_url: e.target.value }))}
                  placeholder="https://tiktok.com/..." type="url"
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm" />
                {editError && <p className="text-xs text-red-500">{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="glass-button glass-button--primary disabled:opacity-50">
                    <Check className="w-4 h-4" /> {es ? 'Guardar' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="phone:min-h-11 flex items-center gap-1 px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">
                    <X className="w-4 h-4" /> {es ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 justify-center sm:justify-start mb-1">
                  <h1 className="text-2xl font-light text-[hsl(var(--foreground))]">
                    {profile.display_name ?? profile.username}
                    {profile.is_verified && <span className="ml-2 text-blue-500 text-sm">✓</span>}
                  </h1>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">@{profile.username || username}</p>
                {profile.bio && <p className="text-sm text-[hsl(var(--foreground))] mb-2 max-w-md">{profile.bio}</p>}
                {profile.website && websiteUrl && (
                  <a 
                    href={websiteUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 justify-center sm:justify-start mb-2"
                  >
                    <ExternalLink className="w-3 h-3" /> {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}

                {/* Social Media Links */}
                <div className="flex gap-3 justify-center sm:justify-start mb-3">
                  {instagramUrl && (
                    <a 
                      href={instagramUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="Instagram"
                      className="text-xs text-[hsl(var(--muted-foreground))] hover:text-pink-500 transition-colors"
                    >
                      📷 Instagram
                    </a>
                  )}
                  {tiktokUrl && (
                    <a 
                      href={tiktokUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="TikTok"
                      className="text-xs text-[hsl(var(--muted-foreground))] hover:text-black dark:hover:text-white transition-colors"
                    >
                      🎵 TikTok
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 phone:gap-4 justify-center sm:justify-start text-sm mb-4">
                  <span><strong>{works.length}</strong> <span className="text-[hsl(var(--muted-foreground))]">{es ? 'obras' : 'works'}</span></span>
                  <button onClick={() => setShowFollowersModal('followers')} className="phone:min-h-11 phone:px-1 group transition-all duration-200 ease-out cursor-pointer">
                    <strong className="group-hover:text-[hsl(var(--foreground))] text-[hsl(var(--foreground))] transition-colors">{followerCount}</strong> <span className="text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors">{es ? 'seguidores' : 'followers'}</span>
                  </button>
                  <button onClick={() => setShowFollowersModal('following')} className="phone:min-h-11 phone:px-1 group transition-all duration-200 ease-out cursor-pointer">
                    <strong className="group-hover:text-[hsl(var(--foreground))] text-[hsl(var(--foreground))] transition-colors">{followingCount}</strong> <span className="text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors">{es ? 'siguiendo' : 'following'}</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-center sm:justify-start">
                  {isOwnProfile ? (
                    <button onClick={() => setEditing(true)}
                      className="phone:min-h-11 px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))] transition-colors">
                      {es ? 'Editar perfil' : 'Edit profile'}
                    </button>
                  ) : (
                    <button onClick={handleFollow}
                      className={`glass-button ${isFollowing
                        ? ''
                        : 'glass-button--primary'}`}>
                      {isFollowing ? (es ? 'Siguiendo' : 'Following') : (es ? 'Seguir' : 'Follow')}
                    </button>
                  )}
                </div>

                {/* Social Media Suggestion Banner */}
                {isOwnProfile && !profile?.instagram_url && !profile?.tiktok_url && (
                  <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs">
                    <p className="font-medium mb-2">
                      {es ? '🎵 Agrega tus redes sociales' : '🎵 Add your social media'}
                    </p>
                    <p className="mb-3">
                      {es 
                        ? 'Conecta tu Instagram o TikTok para que tus seguidores te encuentren más fácilmente.'
                        : 'Connect your Instagram or TikTok so your followers can find you more easily.'}
                    </p>
                    <button 
                      onClick={() => setEditing(true)}
                      className="tap-area text-xs underline hover:opacity-80 transition-opacity"
                    >
                      {es ? 'Editar perfil →' : 'Edit profile →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Works grid */}
        {works.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[hsl(var(--border))] rounded-2xl">
            <p className="text-[hsl(var(--muted-foreground))] text-sm">
              {isOwnProfile
                ? (es ? 'Aún no has publicado ninguna obra.' : "You haven't published any works yet.")
                : (es ? 'Este artista aún no ha publicado obras.' : 'This artist has not published any works yet.')}
            </p>
            {isOwnProfile && (
              <Link to="/subir-obra" className="tap-area mt-4 inline-block text-sm text-[hsl(var(--foreground))] underline underline-offset-2">
                {es ? 'Subir mi primera obra →' : 'Upload my first work →'}
              </Link>
            )}
          </div>
        ) : (
          <MasonryGrid
            items={works}
            columns={GRID_COLUMNS}
            getKey={work => work.id}
            renderItem={work => (
              <div className="mb-4 phone:mb-3 w-full">
                <WorkCard
                  work={work}
                  onWorkChange={() => loadProfile(true)}
                />
              </div>
            )}
          />
        )}
      </main>

      {profile && showFollowersModal && (
        <FollowersModal
          isOpen={!!showFollowersModal}
          onClose={() => setShowFollowersModal(null)}
          userId={profile.id}
          type={showFollowersModal}
          userName={profile.display_name || profile.username}
        />
      )}

      <Footer />
      </div>
    </div>
  );
}
