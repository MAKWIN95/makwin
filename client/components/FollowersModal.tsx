import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase, Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useFollow } from '@/lib/FollowContext';
import { useI18n } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  userName?: string;
}

export default function FollowersModal({ isOpen, onClose, userId, type, userName }: FollowersModalProps) {
  const { user } = useAuth();
  const { setFollowing } = useFollow();
  const { language } = useI18n();
  const es = language === 'es';
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        if (type === 'followers') {
          const { data } = await supabase
            .from('follows')
            .select('follower_id, follower:profiles!follower_id(id, username, display_name, avatar_url)')
            .eq('following_id', userId);

          if (data) {
            const profiles = data
              .map(item => (item.follower as any))
              .filter(p => p && p.id)
              .sort((a, b) => (a.display_name || a.username).localeCompare(b.display_name || b.username));
            setUsers(profiles);
          }
        } else {
          const { data } = await supabase
            .from('follows')
            .select('following_id, following:profiles!following_id(id, username, display_name, avatar_url)')
            .eq('follower_id', userId);

          if (data) {
            const profiles = data
              .map(item => (item.following as any))
              .filter(p => p && p.id)
              .sort((a, b) => (a.display_name || a.username).localeCompare(b.display_name || b.username));
            setUsers(profiles);
          }
        }

        if (user) {
          const { data: followingData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (followingData) {
            const map: Record<string, boolean> = {};
            followingData.forEach(f => map[f.following_id] = true);
            setFollowingMap(map);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, userId, type, user?.id]);

  const handleFollow = async (targetUserId: string, isFollowing: boolean) => {
    if (!user) return;

    try {
      await setFollowing(targetUserId, !isFollowing);
      setFollowingMap(prev => ({
        ...prev,
        [targetUserId]: !isFollowing,
      }));
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === 'followers' ? (es ? 'Seguidores' : 'Followers') : (es ? 'Siguiendo' : 'Following')}
            {userName && ` · ${userName}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
            {type === 'followers'
              ? (es ? 'Sin seguidores aún' : 'No followers yet')
              : (es ? 'No sigue a nadie aún' : 'Not following anyone yet')}
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(profile => (
              <div key={profile.id} className="flex items-center gap-3 p-3 hover:bg-[hsl(var(--muted))] rounded transition-colors">
                <Link to={`/u/${profile.username}`} onClick={onClose} className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-[hsl(var(--muted))]">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-xs font-medium">
                        {(profile.display_name || profile.username)?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[hsl(var(--foreground))] truncate">
                      {profile.display_name || profile.username}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">@{profile.username}</p>
                  </div>
                </Link>

                {user && user.id !== profile.id && (
                  <Button
                    onClick={() => handleFollow(profile.id, followingMap[profile.id] ?? false)}
                    variant={followingMap[profile.id] ? 'default' : 'outline'}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    {followingMap[profile.id] ? (es ? 'Siguiendo' : 'Following') : (es ? 'Seguir' : 'Follow')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
