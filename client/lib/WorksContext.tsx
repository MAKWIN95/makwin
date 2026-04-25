import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface LikeSaveState {
  likedWorks: Set<string>;
  savedWorks: Set<string>;
  likeCounts: Record<string, number>;
}

interface WorksContextType {
  likedWorks: Set<string>;
  savedWorks: Set<string>;
  likeCounts: Record<string, number>;
  
  // Actions
  toggleLike: (workId: string, userId: string) => Promise<number>;
  toggleSave: (workId: string, userId: string) => Promise<boolean>;
  loadUserInteractions: (workIds: string[], userId: string) => Promise<void>;
  updateLikeCount: (workId: string, newCount: number) => void;
  isLiked: (workId: string) => boolean;
  isSaved: (workId: string) => boolean;
  getLikeCount: (workId: string) => number;
}

const WorksContext = createContext<WorksContextType | undefined>(undefined);

export const WorksProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<LikeSaveState>({
    likedWorks: new Set(),
    savedWorks: new Set(),
    likeCounts: {},
  });

  // Load user's interactions (likes & saves) for a batch of works
  const loadUserInteractions = useCallback(async (workIds: string[], userId: string) => {
    if (!workIds.length) return;

    try {
      // Fetch likes
      const { data: likesData } = await supabase
        .from('likes')
        .select('work_id')
        .eq('user_id', userId)
        .in('work_id', workIds);

      // Fetch saves
      const { data: savesData } = await supabase
        .from('saves')
        .select('work_id')
        .eq('user_id', userId)
        .in('work_id', workIds);

      // Fetch current like counts
      const { data: worksData } = await supabase
        .from('works')
        .select('id, like_count')
        .in('id', workIds);

      setState(prev => ({
        ...prev,
        likedWorks: new Set(likesData?.map(l => l.work_id) || []),
        savedWorks: new Set(savesData?.map(s => s.work_id) || []),
        likeCounts: Object.fromEntries(
          (worksData || []).map(w => [w.id, w.like_count])
        ),
      }));
    } catch (err) {
      console.error('[WorksContext] Error loading interactions:', err);
    }
  }, []);

  // Toggle like and return actual count from DB
  const toggleLike = useCallback(async (workId: string, userId: string): Promise<number> => {
    const isLiked = state.likedWorks.has(workId);

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('work_id', workId);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({ user_id: userId, work_id: workId });
      }

      // Re-fetch actual count from DB (source of truth)
      const { data, error } = await supabase
        .from('works')
        .select('like_count')
        .eq('id', workId)
        .single();

      if (error || !data) {
        console.error('[WorksContext] Error fetching like_count:', error);
        return state.likeCounts[workId] || 0;
      }

      const newCount = data.like_count;

      // Update state
      setState(prev => ({
        ...prev,
        likedWorks: new Set(isLiked 
          ? Array.from(prev.likedWorks).filter(id => id !== workId)
          : [...Array.from(prev.likedWorks), workId]
        ),
        likeCounts: { ...prev.likeCounts, [workId]: newCount },
      }));

      return newCount;
    } catch (err) {
      console.error('[WorksContext] Error toggling like:', err);
      return state.likeCounts[workId] || 0;
    }
  }, [state.likedWorks, state.likeCounts]);

  // Toggle save
  const toggleSave = useCallback(async (workId: string, userId: string): Promise<boolean> => {
    const isSaved = state.savedWorks.has(workId);

    try {
      if (isSaved) {
        // Unsave
        await supabase
          .from('saves')
          .delete()
          .eq('user_id', userId)
          .eq('work_id', workId);
      } else {
        // Save
        await supabase
          .from('saves')
          .insert({ user_id: userId, work_id: workId });
      }

      // Update state
      setState(prev => ({
        ...prev,
        savedWorks: new Set(isSaved
          ? Array.from(prev.savedWorks).filter(id => id !== workId)
          : [...Array.from(prev.savedWorks), workId]
        ),
      }));

      return !isSaved;
    } catch (err) {
      console.error('[WorksContext] Error toggling save:', err);
      return isSaved;
    }
  }, [state.savedWorks]);

  // Update like count in state
  const updateLikeCount = useCallback((workId: string, newCount: number) => {
    setState(prev => ({
      ...prev,
      likeCounts: { ...prev.likeCounts, [workId]: newCount },
    }));
  }, []);

  const value: WorksContextType = {
    likedWorks: state.likedWorks,
    savedWorks: state.savedWorks,
    likeCounts: state.likeCounts,
    toggleLike,
    toggleSave,
    loadUserInteractions,
    updateLikeCount,
    isLiked: (workId: string) => state.likedWorks.has(workId),
    isSaved: (workId: string) => state.savedWorks.has(workId),
    getLikeCount: (workId: string) => state.likeCounts[workId] || 0,
  };

  return (
    <WorksContext.Provider value={value}>
      {children}
    </WorksContext.Provider>
  );
};

export const useWorks = () => {
  const context = useContext(WorksContext);
  if (!context) {
    throw new Error('useWorks must be used within WorksProvider');
  }
  return context;
};
