import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { User, UserPlus } from 'lucide-react';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function FollowButton({
  userId,
  isFollowing: initialFollowing,
  onFollowChange,
  className = '',
  size = 'md',
}: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      window.dispatchEvent(new CustomEvent('showAuthModal'));
      return;
    }

    if (user.id === userId) {
      return; // Can't follow yourself
    }

    setLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: userId,
        });
        setIsFollowing(true);
      }

      onFollowChange?.(isFollowing ? false : true);
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={loading}
      variant={isFollowing ? 'default' : 'outline'}
      className={`transition-all duration-200 ease-out ${sizeClasses[size]} ${className}`}
    >
      {isFollowing ? (
        <>
          <User className="w-4 h-4 mr-2" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Seguir
        </>
      )}
    </Button>
  );
}
