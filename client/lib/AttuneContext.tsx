import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from './supabase';

export interface AttuneScore {
  id?: string;
  user_id?: string;
  username?: string;
  experience: 'color' | 'tonal' | 'temporal';
  score: number;
  accuracy: number;
  rounds: number;
  created_at?: string;
}

interface AttuneContextType {
  tempScore: AttuneScore | null;
  setTempScore: (score: AttuneScore | null) => void;
  leaderboard: AttuneScore[];
  loadLeaderboard: (experience: string) => Promise<void>;
  publishScore: (score: AttuneScore) => Promise<boolean>;
  hasLoadedLeaderboard: { [key: string]: boolean };
}

const AttuneContext = createContext<AttuneContextType | undefined>(undefined);

export const AttuneProvider = ({ children }: { children: ReactNode }) => {
  const [tempScore, setTempScore] = useState<AttuneScore | null>(null);
  const [leaderboard, setLeaderboard] = useState<AttuneScore[]>([]);
  const [hasLoadedLeaderboard, setHasLoadedLeaderboard] = useState<{ [key: string]: boolean }>({});

  const loadLeaderboard = async (experience: string) => {
    if (hasLoadedLeaderboard[experience]) return;
    
    try {
      const { data, error } = await supabase
        .from('attune_scores')
        .select('*')
        .eq('experience', experience)
        .order('score', { ascending: false })
        .limit(100);

      if (!error && data) {
        setLeaderboard(data as AttuneScore[]);
        setHasLoadedLeaderboard(prev => ({ ...prev, [experience]: true }));
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  };

  const publishScore = async (score: AttuneScore): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('attune_scores')
        .insert([score]);

      if (!error) {
        setTempScore(null);
        // Reload leaderboard
        setHasLoadedLeaderboard(prev => ({ ...prev, [score.experience]: false }));
        await loadLeaderboard(score.experience);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error publishing score:', err);
      return false;
    }
  };

  return (
    <AttuneContext.Provider
      value={{
        tempScore,
        setTempScore,
        leaderboard,
        loadLeaderboard,
        publishScore,
        hasLoadedLeaderboard,
      }}
    >
      {children}
    </AttuneContext.Provider>
  );
};

export const useAttune = () => {
  const context = useContext(AttuneContext);
  if (!context) {
    throw new Error('useAttune must be used within AttuneProvider');
  }
  return context;
};
