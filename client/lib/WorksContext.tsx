import { createContext, useContext, useState, useCallback, ReactNode, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface LikeSaveState {
  likedWorks: Set<string>;
  savedWorks: Set<string>;
  likeCounts: Record<string, number>;
  pendingLikes: Set<string>;
  pendingSaves: Set<string>;
}

interface WorksContextType {
  likedWorks: Set<string>;
  savedWorks: Set<string>;
  likeCounts: Record<string, number>;
  pendingLikes: Set<string>;
  pendingSaves: Set<string>;
  
  toggleLike: (workId: string, userId: string) => Promise<{ liked: boolean; count: number }>;
  toggleSave: (workId: string, userId: string) => Promise<boolean>;
  loadUserInteractions: (workIds: string[], userId: string, authoritativeLikeCounts?: Record<string, number>) => Promise<void>;
  clearInteractions: () => void;
  updateLikeCount: (workId: string, newCount: number) => void;
  isLiked: (workId: string) => boolean;
  isSaved: (workId: string) => boolean;
  getLikeCount: (workId: string) => number;
  isPendingLike: (workId: string) => boolean;
  isPendingSave: (workId: string) => boolean;
}

const WorksContext = createContext<WorksContextType | undefined>(undefined);

export const WorksProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<LikeSaveState>({
    likedWorks: new Set(),
    savedWorks: new Set(),
    likeCounts: {},
    pendingLikes: new Set(),
    pendingSaves: new Set(),
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const activeUserIdRef = useRef<string | null>(null);
  const interactionRequestRef = useRef(0);
  const interactionMutationRef = useRef(0);

  const loadUserInteractions = useCallback(async (workIds: string[], userId: string, authoritativeLikeCounts?: Record<string, number>) => {
    if (!workIds.length) return;

    try {
      const requestId = interactionRequestRef.current + 1;
      interactionRequestRef.current = requestId;
      const mutationVersion = interactionMutationRef.current;

      if (activeUserIdRef.current !== userId) {
        activeUserIdRef.current = userId;
        setState(prev => ({
          ...prev,
          likedWorks: new Set(),
          savedWorks: new Set(),
          pendingLikes: new Set(),
          pendingSaves: new Set(),
          likeCounts: {},
        }));
      }

      const [likesResult, savesResult] = await Promise.all([
        supabase
          .from('likes')
          .select('work_id')
          .eq('user_id', userId)
          .in('work_id', workIds),
        supabase
          .from('saves')
          .select('work_id')
          .eq('user_id', userId)
          .in('work_id', workIds),
      ]);

      if (likesResult.error) throw likesResult.error;
      if (savesResult.error) throw savesResult.error;
      if (requestId !== interactionRequestRef.current || activeUserIdRef.current !== userId || mutationVersion !== interactionMutationRef.current) return;

      setState(prev => ({
        ...prev,
        likedWorks: new Set([
          ...Array.from(prev.likedWorks).filter(id => !workIds.includes(id)),
          ...(likesResult.data?.map(l => l.work_id) || []),
        ]),
        savedWorks: new Set([
          ...Array.from(prev.savedWorks).filter(id => !workIds.includes(id)),
          ...(savesResult.data?.map(s => s.work_id) || []),
        ]),
        likeCounts: authoritativeLikeCounts ? { ...prev.likeCounts, ...authoritativeLikeCounts } : prev.likeCounts,
      }));
    } catch (err) {
      console.error('[WorksContext:loadUserInteractions] Error:', err);
    }
  }, []);

  const toggleLike = useCallback(async (workId: string, userId: string): Promise<{ liked: boolean; count: number }> => {
    const isLiked = stateRef.current.likedWorks.has(workId);
    const isPending = stateRef.current.pendingLikes.has(workId);

    if (isPending) {
      console.warn(`[WorksContext:toggleLike] Request already pending for work ${workId}`);
      return { liked: isLiked, count: stateRef.current.likeCounts[workId] || 0 };
    }

    const mutationVersion = interactionMutationRef.current + 1;
    interactionMutationRef.current = mutationVersion;

    const previousLikeCount = stateRef.current.likeCounts[workId] || 0;
    const optimisticCount = isLiked ? Math.max(previousLikeCount - 1, 0) : previousLikeCount + 1;

    setState(prev => ({
      ...prev,
      pendingLikes: new Set([...prev.pendingLikes, workId]),
    }));

    setState(prev => ({
      ...prev,
      likedWorks: new Set(isLiked 
        ? Array.from(prev.likedWorks).filter(id => id !== workId)
        : [...Array.from(prev.likedWorks), workId]
      ),
      likeCounts: { ...prev.likeCounts, [workId]: optimisticCount },
    }));

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('work_id', workId);

        if (error) {
          console.error('[WorksContext:toggleLike] Delete error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: userId, work_id: workId }, { count: 'exact' });

        if (error) {
          if (error.code === '23505') {
            console.debug('[WorksContext:toggleLike] Like already exists (idempotent)');
          } else {
            console.error('[WorksContext:toggleLike] Insert error:', error);
            throw error;
          }
        }
      }

      // The database trigger maintains the global count. Read it from works,
      // never by counting likes through an RLS-filtered client query.
      let actualCount = optimisticCount;
      const { data: workData, error: workCountError } = await supabase
        .from('works')
        .select('like_count')
        .eq('id', workId)
        .maybeSingle();
      if (workCountError) {
        console.warn('[WorksContext:toggleLike] Could not reconcile works.like_count:', workCountError);
      } else if (typeof workData?.like_count === 'number') {
        actualCount = workData.like_count;
      }

      if (mutationVersion !== interactionMutationRef.current || activeUserIdRef.current !== userId) {
        return { liked: !isLiked, count: actualCount };
      }

      setState(prev => ({
        ...prev,
        pendingLikes: new Set([...prev.pendingLikes].filter(id => id !== workId)),
      }));

      console.debug(`[WorksContext:toggleLike] Work ${workId} (${isLiked ? 'unlike' : 'like'}): count=${actualCount}`);
      return { liked: !isLiked, count: actualCount };
    } catch (err) {
      console.error('[WorksContext:toggleLike] Error:', err);

      if (mutationVersion === interactionMutationRef.current && activeUserIdRef.current === userId) {
        setState(prev => ({
          ...prev,
          likedWorks: new Set(isLiked
            ? [...Array.from(prev.likedWorks), workId]
            : Array.from(prev.likedWorks).filter(id => id !== workId)
          ),
          likeCounts: { ...prev.likeCounts, [workId]: previousLikeCount },
          pendingLikes: new Set([...prev.pendingLikes].filter(id => id !== workId)),
        }));
      }

      return { liked: isLiked, count: previousLikeCount };
    }
  }, []);

  const toggleSave = useCallback(async (workId: string, userId: string): Promise<boolean> => {
    const isSaved = stateRef.current.savedWorks.has(workId);
    const isPending = stateRef.current.pendingSaves.has(workId);

    if (isPending) {
      console.warn(`[WorksContext:toggleSave] Request already pending for work ${workId}`);
      return isSaved;
    }

    const mutationVersion = interactionMutationRef.current + 1;
    interactionMutationRef.current = mutationVersion;

    setState(prev => ({
      ...prev,
      pendingSaves: new Set([...prev.pendingSaves, workId]),
      savedWorks: new Set(isSaved
        ? Array.from(prev.savedWorks).filter(id => id !== workId)
        : [...Array.from(prev.savedWorks), workId]
      ),
    }));

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saves')
          .delete()
          .eq('user_id', userId)
          .eq('work_id', workId);

        if (error) {
          console.error('[WorksContext:toggleSave] Delete error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('saves')
          .insert({ user_id: userId, work_id: workId }, { count: 'exact' });

        if (error) {
          if (error.code === '23505') {
            console.debug('[WorksContext:toggleSave] Save already exists (idempotent)');
          } else {
            console.error('[WorksContext:toggleSave] Insert error:', error);
            throw error;
          }
        }
      }

      if (mutationVersion !== interactionMutationRef.current || activeUserIdRef.current !== userId) {
        return !isSaved;
      }

      setState(prev => ({
        ...prev,
        pendingSaves: new Set([...prev.pendingSaves].filter(id => id !== workId)),
      }));

      console.debug(`[WorksContext:toggleSave] Work ${workId} (${isSaved ? 'unsave' : 'save'})`);
      return !isSaved;
    } catch (err) {
      console.error('[WorksContext:toggleSave] Error:', err);

      if (mutationVersion === interactionMutationRef.current && activeUserIdRef.current === userId) {
        setState(prev => ({
          ...prev,
          savedWorks: new Set(isSaved
            ? [...Array.from(prev.savedWorks), workId]
            : Array.from(prev.savedWorks).filter(id => id !== workId)
          ),
          pendingSaves: new Set([...prev.pendingSaves].filter(id => id !== workId)),
        }));
      }

      return isSaved;
    }
  }, []);

  const updateLikeCount = useCallback((workId: string, newCount: number) => {
    setState(prev => ({
      ...prev,
      likeCounts: { ...prev.likeCounts, [workId]: newCount },
    }));
  }, []);

  const clearInteractions = useCallback(() => {
    activeUserIdRef.current = null;
    interactionRequestRef.current += 1;
    interactionMutationRef.current += 1;
    setState({
      likedWorks: new Set(),
      savedWorks: new Set(),
      likeCounts: {},
      pendingLikes: new Set(),
      pendingSaves: new Set(),
    });
  }, []);

  const value: WorksContextType = useMemo(() => ({
    likedWorks: state.likedWorks,
    savedWorks: state.savedWorks,
    likeCounts: state.likeCounts,
    pendingLikes: state.pendingLikes,
    pendingSaves: state.pendingSaves,
    toggleLike,
    toggleSave,
    loadUserInteractions,
    clearInteractions,
    updateLikeCount,
    isLiked: (workId: string) => state.likedWorks.has(workId),
    isSaved: (workId: string) => state.savedWorks.has(workId),
    getLikeCount: (workId: string) => state.likeCounts[workId] || 0,
    isPendingLike: (workId: string) => state.pendingLikes.has(workId),
    isPendingSave: (workId: string) => state.pendingSaves.has(workId),
  }), [
    state.likedWorks,
    state.savedWorks,
    state.likeCounts,
    state.pendingLikes,
    state.pendingSaves,
    toggleLike,
    toggleSave,
    loadUserInteractions,
    clearInteractions,
    updateLikeCount,
  ]);

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
