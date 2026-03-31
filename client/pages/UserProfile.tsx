import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, Profile, Work } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WorkCard from '@/components/WorkCard';
import { Camera, Check, X, ExternalLink, Loader2 } from 'lucide-react';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile, updateProfile, refreshProfile } = useAuth();
  const { language } = useI18n();
  const navigate = useNavigate();
  const es = language === 'es';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', bio: '', website: '' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isOwnProfile = myProfile?.username === username;

  useEffect(() => {
    if (!username) return;
    loadProfile();
  }, [username, user]);

  const loadProfile = async () => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username!)
      .single();

    if (!profileData) { setLoading(false); return; }
    setProfile(profileData as Profile);
    setEditForm({ display_name: profileData.display_name ?? '', bio: profileData.bio ?? '', website: profileData.website ?? '' });

    // Works
    const { data: worksData } = await supabase
      .from('works')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    setWorks((worksData ?? []) as Work[]);

    // Follow counts
    const [{ count: fwrCount }, { count: fwgCount }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
    ]);
    setFollowerCount(fwrCount ?? 0);
    setFollowingCount(fwgCount ?? 0);

    // Is following?
    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', profileData.id)
        .maybeSingle();
      setIsFollowing(!!followData);
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user || !profile) { navigate('/login'); return; }
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id);
      setIsFollowing(false);
      setFollowerCount(c => Math.max(c - 1, 0));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setEditError('');
    const { error } = await updateProfile(editForm);
    setSaving(false);
    if (error) { setEditError(error); return; }
    await refreshProfile();
    setEditing(false);
    loadProfile();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: publicUrl + '?t=' + Date.now() });
      await refreshProfile();
      loadProfile();
    }
    setAvatarUploading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--muted-foreground))]" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[hsl(var(--foreground))] mb-4">{es ? 'Usuario no encontrado' : 'User not found'}</p>
        <Link to="/galeria" className="text-sm underline text-[hsl(var(--muted-foreground))]">← {es ? 'Volver' : 'Back'}</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Header showSearchCentered />

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 page-enter">

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))]">
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
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="space-y-3 max-w-sm">
                <input value={editForm.display_name} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))}
                  placeholder={es ? 'Nombre visible' : 'Display name'}
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm" />
                <textarea value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder={es ? 'Bio (opcional)' : 'Bio (optional)'} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm resize-none" />
                <input value={editForm.website} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://..." type="url"
                  className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-sm" />
                {editError && <p className="text-xs text-red-500">{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm hover:opacity-90 disabled:opacity-50">
                    <Check className="w-4 h-4" /> {es ? 'Guardar' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))]">
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
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">@{profile.username}</p>
                {profile.bio && <p className="text-sm text-[hsl(var(--foreground))] mb-2 max-w-md">{profile.bio}</p>}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1 justify-center sm:justify-start mb-3">
                    <ExternalLink className="w-3 h-3" /> {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                )}

                {/* Stats */}
                <div className="flex gap-6 justify-center sm:justify-start text-sm mb-4">
                  <span><strong>{works.length}</strong> <span className="text-[hsl(var(--muted-foreground))]">{es ? 'obras' : 'works'}</span></span>
                  <span><strong>{followerCount}</strong> <span className="text-[hsl(var(--muted-foreground))]">{es ? 'seguidores' : 'followers'}</span></span>
                  <span><strong>{followingCount}</strong> <span className="text-[hsl(var(--muted-foreground))]">{es ? 'siguiendo' : 'following'}</span></span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-center sm:justify-start">
                  {isOwnProfile ? (
                    <button onClick={() => setEditing(true)}
                      className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--muted))] transition-colors">
                      {es ? 'Editar perfil' : 'Edit profile'}
                    </button>
                  ) : (
                    <button onClick={handleFollow}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${isFollowing
                        ? 'border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                        : 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:opacity-90'}`}>
                      {isFollowing ? (es ? 'Siguiendo' : 'Following') : (es ? 'Seguir' : 'Follow')}
                    </button>
                  )}
                </div>
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
              <Link to="/subir-obra" className="mt-4 inline-block text-sm text-[hsl(var(--foreground))] underline underline-offset-2">
                {es ? 'Subir mi primera obra →' : 'Upload my first work →'}
              </Link>
            )}
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
            {works.map(work => (
              <div key={work.id} className="inline-block w-full mb-4 break-inside-avoid">
                <WorkCard work={work} />
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
