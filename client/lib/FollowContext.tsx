import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

interface FollowContextType {
  followingSet: Set<string>;
  isFollowing: (userId: string) => boolean;
  setFollowing: (userId: string, isFollowing: boolean) => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  isLoaded: boolean;
  reload: () => Promise<void>;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const FollowProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load all followed users from Supabase
  const loadFollowingList = useCallback(async () => {
    if (!user) {
      setFollowingSet(new Set());
      setIsLoaded(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;

      const newSet = new Set((data ?? []).map(d => d.following_id));
      setFollowingSet(newSet);
      setIsLoaded(true);
    } catch (err) {
      console.error('[FollowContext] Load error:', err);
      setIsLoaded(true);
    }
  }, [user]);

  // Reload on auth change
  useEffect(() => {
    loadFollowingList();
  }, [user?.id, loadFollowingList]);

  const isFollowing = useCallback((userId: string) => {
    return followingSet.has(userId);
  }, [followingSet]);

  // Optimistic update + server sync
  const setFollowing = useCallback(async (userId: string, following: boolean) => {
    if (!user) return;

    // Optimistic update
    setFollowingSet(prev => {
      const newSet = new Set(prev);
      if (following) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });

    // Server sync
    try {
      if (following) {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        if (error) throw error;
      }
    } catch (err) {
      console.error('[FollowContext] Sync error:', err);
      // Revert optimistic update on error
      await loadFollowingList();
    }
  }, [user, loadFollowingList]);

  const toggleFollow = useCallback(async (userId: string) => {
    await setFollowing(userId, !isFollowing(userId));
  }, [isFollowing, setFollowing]);

  return (
    <FollowContext.Provider
      value={{
        followingSet,
        isFollowing,
        setFollowing,
        toggleFollow,
        isLoaded,
        reload: loadFollowingList,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollow must be used within FollowProvider');
  }
  return context;
};
