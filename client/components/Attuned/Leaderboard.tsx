import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAttune } from '@/lib/AttuneContext';
import { Trophy, Crown, Award } from 'lucide-react';

interface LeaderboardProps {
  experience: 'color' | 'tonal' | 'temporal';
}

export default function Leaderboard({ experience }: LeaderboardProps) {
  const { language } = useI18n();
  const { leaderboard, loadLeaderboard } = useAttune();
  const [isLoading, setIsLoading] = useState(false);
  const es = language === 'es';

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await loadLeaderboard(experience);
      setIsLoading(false);
    };
    load();
  }, [experience]);

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const experienceTitle: { [key: string]: { es: string; en: string } } = {
    color: { es: 'Resonancia de Color', en: 'Color Resonance' },
    tonal: { es: 'Reconocimiento Tonal', en: 'Tonal Recognition' },
    temporal: { es: 'Calibración Temporal', en: 'Temporal Calibration' },
  };

  const title = experienceTitle[experience][es ? 'es' : 'en'];

  return (
    <div className="w-full max-w-2xl space-y-6 animate-in fade-in">
      <div>
        <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">
          {es ? 'Mejores puntuaciones' : 'Top scores'}
        </p>
        <h3 className="text-2xl font-black uppercase tracking-wide text-[hsl(var(--foreground))]">
          {title}
        </h3>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
          <p className="text-sm">{es ? 'Cargando...' : 'Loading...'}</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
          <p className="text-sm">{es ? 'No hay puntuaciones aún' : 'No scores yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {leaderboard.map((score, idx) => (
            <div
              key={idx}
              className="bg-[hsl(var(--popover))/0.5] rounded-lg p-4 flex items-center justify-between animate-in fade-in"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--muted))]/40 font-black text-[hsl(var(--foreground))]">
                  {idx < 3 ? (
                    getMedalIcon(idx + 1)
                  ) : (
                    <span className="text-sm">#{idx + 1}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-[hsl(var(--foreground))]">
                    {score.username}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {score.rounds} {es ? 'rondas' : 'rounds'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[hsl(var(--foreground))]">
                  {score.score}%
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {score.accuracy}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
