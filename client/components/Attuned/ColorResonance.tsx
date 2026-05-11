import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useAttune } from '@/lib/AttuneContext';
import { Share2 } from 'lucide-react';

type Stage = 'setup' | 'observing' | 'adjusting' | 'result';

interface RoundResult {
  targetColor: { h: number; s: number; l: number };
  userColor: { h: number; s: number; l: number };
  accuracy: number;
}

export default function ColorResonance({ onBack }: { onBack?: () => void }) {
  const { language } = useI18n();
  const { user, profile } = useAuth();
  const { setTempScore, publishScore } = useAttune();
  const es = language === 'es';

  const [stage, setStage] = useState<Stage>('setup');
  const [rounds, setRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [targetColor, setTargetColor] = useState({ h: 0, s: 0, l: 50 });
  const [userColor, setUserColor] = useState({ h: 0, s: 50, l: 50 });
  const [results, setResults] = useState<RoundResult[]>([]);
  const [averageAccuracy, setAverageAccuracy] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (stage === 'result' && results.length > 0) {
      const duration = 800;
      const startTime = Date.now();
      const avgAcc = Math.round(
        results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
      );
      setAverageAccuracy(avgAcc);

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimatedScore(Math.round(avgAcc * progress));

        if (progress === 1) {
          clearInterval(interval);
          playSuccessSound();
        }
      }, 16);

      return () => clearInterval(interval);
    }
  }, [stage, results]);

  const playSuccessSound = () => {
    try {
      const audioCtx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {}
  };

  const generateColor = () => {
    setTargetColor({
      h: Math.floor(Math.random() * 360),
      s: Math.floor(Math.random() * 40) + 60,
      l: Math.floor(Math.random() * 30) + 40,
    });
    setUserColor({ h: 180, s: 50, l: 50 });
  };

  const calculateAccuracy = () => {
    const hDiff = Math.min(
      Math.abs(userColor.h - targetColor.h),
      360 - Math.abs(userColor.h - targetColor.h)
    );
    const sDiff = Math.abs(userColor.s - targetColor.s);
    const lDiff = Math.abs(userColor.l - targetColor.l);

    // Much stricter scoring
    // Hue: 0-180 range, penalize heavily (any 30° difference = major loss)
    // Saturation: 0-100 range, each point matters
    // Lightness: 0-100 range, each point matters
    const huePenalty = (hDiff / 30) * 100;    // 30° = full penalty
    const satPenalty = (sDiff / 20) * 100;    // 20% = full penalty
    const lightPenalty = (lDiff / 20) * 100;  // 20% = full penalty
    
    const accuracy = Math.max(
      0,
      100 - (huePenalty + satPenalty + lightPenalty) / 3
    );
    return Math.round(accuracy);
  };

  const handleStartExperience = () => {
    generateColor();
    setStage('observing');
    setTimeout(() => setStage('adjusting'), 2500);
  };

  const handleSubmitRound = () => {
    const acc = calculateAccuracy();
    const newResult: RoundResult = {
      targetColor: { ...targetColor },
      userColor: { ...userColor },
      accuracy: acc,
    };

    setResults([...results, newResult]);

    if (currentRound >= rounds) {
      setStage('result');
    } else {
      setCurrentRound(currentRound + 1);
      generateColor();
      setStage('observing');
      setTimeout(() => setStage('adjusting'), 2500);
    }
  };

  const handlePublishScore = async () => {
    if (!user || !profile) return;

    const success = await publishScore({
      user_id: user.id,
      username: profile.username,
      experience: 'color',
      score: averageAccuracy,
      accuracy: averageAccuracy,
      rounds: rounds,
      created_at: new Date().toISOString(),
    });

    if (success) {
      setTimeout(() => onBack?.(), 500);
    }
  };

  const hslToString = (h: number, s: number, l: number) =>
    `hsl(${h}, ${s}%, ${l}%)`;

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {stage === 'setup' && (
        <div className="max-w-md text-center space-y-8 animate-in fade-in">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-wide text-[hsl(var(--foreground))] mb-2">
              {es ? 'Resonancia Cromática' : 'Color Resonance'}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-light">
              {es
                ? 'Observa un color y reconstruye su esencia con máxima precisión.'
                : 'Observe a color and reconstruct its essence with precision.'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">
              {es ? 'Elige rondas' : 'Choose rounds'}
            </p>
            <div className="flex gap-3 justify-center">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setRounds(n)}
                  className={`w-12 h-12 rounded-lg font-black transition-all duration-300 text-sm ${
                    rounds === n
                      ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))]'
                      : 'border border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartExperience}
            className="w-full py-3 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition-all duration-300 active:scale-95"
          >
            {es ? 'Comenzar' : 'Begin'}
          </button>
        </div>
      )}

      {stage === 'observing' && (
        <div className="text-center max-w-lg animate-in fade-in">
          <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-8">
            {es ? `Ronda ${currentRound}/${rounds} - Memoriza` : `Round ${currentRound}/${rounds} - Memorize`}
          </p>
          <div className="mb-8">
            <div
              className="w-48 h-48 rounded-3xl border-4 border-[rgba(80,80,80,0.2)] shadow-2xl mx-auto transition-all duration-500"
              style={{
                backgroundColor: hslToString(
                  targetColor.h,
                  targetColor.s,
                  targetColor.l
                ),
              }}
            />
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {es ? 'Preparándose...' : 'Preparing...'}
          </p>
        </div>
      )}

      {stage === 'adjusting' && (
        <div className="max-w-2xl w-full animate-in fade-in">
          <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-8 text-center">
            {es ? `Ronda ${currentRound}/${rounds} - Ajusta los controles` : `Round ${currentRound}/${rounds} - Adjust`}
          </p>

          <div className="space-y-8">
            {/* Color Preview - Only show user color during adjusting */}
            <div className="flex gap-4 justify-center">
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">
                  {es ? 'Tu respuesta' : 'Your color'}
                </p>
                <div
                  className="w-24 h-24 rounded-2xl border-2 border-[rgba(80,80,80,0.2)] shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: hslToString(
                      userColor.h,
                      userColor.s,
                      userColor.l
                    ),
                  }}
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
              {/* Hue */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                    HUE
                  </label>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {userColor.h}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={userColor.h}
                  onChange={(e) =>
                    setUserColor({
                      ...userColor,
                      h: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-3 rounded-full appearance-none cursor-pointer accent-[hsl(var(--foreground))] transition-all duration-200"
                  style={{
                    background: `linear-gradient(to right, rgb(255,0,0), rgb(255,255,0), rgb(0,255,0), rgb(0,255,255), rgb(0,0,255), rgb(255,0,255), rgb(255,0,0))`,
                  }}
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                    SATURATION
                  </label>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {userColor.s}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={userColor.s}
                  onChange={(e) =>
                    setUserColor({
                      ...userColor,
                      s: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-3 rounded-full appearance-none cursor-pointer accent-[hsl(var(--foreground))] transition-all duration-200"
                  style={{
                    background: `linear-gradient(to right, hsl(${userColor.h}, 0%, ${userColor.l}%), hsl(${userColor.h}, 100%, ${userColor.l}%))`,
                  }}
                />
              </div>

              {/* Lightness */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))]">
                    LIGHTNESS
                  </label>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {userColor.l}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={userColor.l}
                  onChange={(e) =>
                    setUserColor({
                      ...userColor,
                      l: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-3 rounded-full appearance-none cursor-pointer accent-[hsl(var(--foreground))] transition-all duration-200"
                  style={{
                    background: `linear-gradient(to right, hsl(${userColor.h}, ${userColor.s}%, 0%), hsl(${userColor.h}, ${userColor.s}%, 50%), hsl(${userColor.h}, ${userColor.s}%, 100%))`,
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSubmitRound}
              className="w-full py-3 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition-all duration-300 active:scale-95"
            >
              {es ? 'Verificar' : 'Verify'}
            </button>
          </div>
        </div>
      )}

      {stage === 'result' && (
        <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in">
          <div>
            <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-4">
              {es ? 'Precisión promedio' : 'Average accuracy'}
            </p>
            <div className="text-7xl font-black text-[hsl(var(--foreground))]">
              {animatedScore}%
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {results.map((result, idx) => (
              <div key={idx} className="bg-[hsl(var(--popover))/0.4] rounded-lg p-4 text-left animate-in fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    {es ? 'Ronda' : 'Round'} {idx + 1}
                  </span>
                  <span className="text-lg font-black text-[hsl(var(--foreground))]">
                    {result.accuracy}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Matiz' : 'Hue'}
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded-full border border-[hsl(var(--border))]"
                        style={{
                          backgroundColor: `hsl(${result.targetColor?.h || 0}, 100%, 50%)`
                        }}
                      />
                      <span className="text-[0.7rem]">
                        {result.targetColor?.h || 0}° → {result.userColor?.h || 0}°
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Saturación' : 'Sat'}
                    </div>
                    <span className="text-[0.7rem]">
                      {result.targetColor?.s || 0}% → {result.userColor?.s || 0}%
                    </span>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Luminancia' : 'Light'}
                    </div>
                    <span className="text-[0.7rem]">
                      {result.targetColor?.l || 0}% → {result.userColor?.l || 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePublishScore}
              className="flex-1 py-3 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-black uppercase tracking-wider rounded-lg hover:opacity-90 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {es ? 'Publicar' : 'Publish'}
            </button>
            <button
              onClick={() => {
                setStage('setup');
                setCurrentRound(1);
                setResults([]);
                setAnimatedScore(0);
              }}
              className="flex-1 py-3 border border-[hsl(var(--border))] text-[hsl(var(--foreground))] font-black uppercase tracking-wider rounded-lg hover:bg-[hsl(var(--muted))] transition-all duration-300 active:scale-95"
            >
              {es ? 'Repetir' : 'Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
