import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useFollow } from '@/lib/FollowContext';
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
  const { isFollowing: isFollowingGlobal, setFollowing } = useFollow();
  const [loading, setLoading] = useState(false);

  // Use global follow state (don't need to sync if context loads it properly)
  const isFollowing = isFollowingGlobal(userId);

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
      await setFollowing(userId, !isFollowing);
      onFollowChange?.(!isFollowing);
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
      variant="outline"
      className={`transition-all duration-200 ease-out ${sizeClasses[size]} ${className} ${
        isFollowing
          ? 'bg-[#000000] text-white border-[#000000] hover:opacity-90'
          : 'bg-white border border-white text-[#000000] hover:opacity-90'
      }`}
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
