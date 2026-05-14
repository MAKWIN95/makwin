import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useAttune } from '@/lib/AttuneContext';
import { Share2 } from 'lucide-react';

type Stage = 'setup' | 'countdown' | 'showing' | 'responding' | 'result';

interface RoundResult {
  targetDuration: number;
  userDuration: number;
  accuracy: number;
}

const MIN_DURATION = 500; // 0.5s in ms
const MAX_DURATION = 4500; // 4.5s in ms

export default function TemporalCalibration({ onBack }: { onBack?: () => void }) {
  const { language } = useI18n();
  const { user, profile } = useAuth();
  const { setTempScore, publishScore } = useAttune();
  const es = language === 'es';
  
  const [stage, setStage] = useState<Stage>('setup');
  const [rounds, setRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [targetDuration, setTargetDuration] = useState<number>(0);
  const [userDuration, setUserDuration] = useState<number>(0);
  const [isHolding, setIsHolding] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [averageAccuracy, setAverageAccuracy] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

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

  useEffect(() => {
    return () => stopAmbientSound();
  }, []);

  const playAmbientSound = () => {
    try {
      // Ensure previous sound is stopped
      stopAmbientSound();

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioCtx = audioContextRef.current;
      
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.error('[Temporal] Resume failed:', e));
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 200;
      gain.gain.value = 0.08;
      osc.start(audioCtx.currentTime);
      
      oscillatorRef.current = osc;
      gainRef.current = gain;
    } catch (e) {
      console.error('[Temporal] Ambient sound error:', e);
    }
  };

  const stopAmbientSound = () => {
    try {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch {}
        oscillatorRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current = null;
      }
    } catch (e) {
      console.error('[Temporal] Stop ambient error:', e);
    }
  };

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

  const generateDuration = () => {
    setTargetDuration(Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION)) + MIN_DURATION);
    setUserDuration(0);
  };

  const calculateAccuracy = () => {
    const diff = Math.abs(userDuration - targetDuration);
    const maxDiff = MAX_DURATION - MIN_DURATION;
    return Math.max(0, Math.round(100 - (diff / maxDiff) * 100));
  };

  const handleStartExperience = () => {
    generateDuration();
    startCountdown(1);
  };

  const startCountdown = (round: number) => {
    setCurrentRound(round);
    setStage('countdown');
    
    // Show 3-2-1 countdown
    let countdown = 3;
    setCountdownNumber(countdown);
    
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        setCountdownNumber(countdown);
      } else {
        clearInterval(countdownInterval);
        setCountdownNumber(null);
        setStage('showing');
        // Play the target duration sound
        playAmbientSound();
        // Stop after target duration
        setTimeout(() => {
          stopAmbientSound();
        }, targetDuration);
      }
    }, 1000);
  };
  const handleMouseDown = () => {
    // Only allow holding in 'showing' or 'responding' stage
    if (stage !== 'showing' && stage !== 'responding') return;
    
    // If in 'showing', stop the target sound and transition to 'responding'
    if (stage === 'showing') {
      stopAmbientSound();
      setStage('responding');
      // Delay slight amount before starting user's response tracking
      setTimeout(() => {
        setIsHolding(true);
        playAmbientSound();
        startTimeRef.current = Date.now();
      }, 50);
      return;
    }
    
    // If already in 'responding' and not holding yet, start holding
    if (!isHolding) {
      setIsHolding(true);
      playAmbientSound();
      startTimeRef.current = Date.now();
    }
  };

  const handleMouseUp = () => {
    if (!isHolding) return;
    
    setIsHolding(false);
    stopAmbientSound();
    const currentDuration = Date.now() - startTimeRef.current;
    
    setUserDuration(currentDuration);

    const acc = calculateAccuracy();
    const newResult: RoundResult = {
      targetDuration,
      userDuration: currentDuration,
      accuracy: acc,
    };

    setResults([...results, newResult]);

    if (currentRound >= rounds) {
      setStage('result');
    } else {
      // Pause between rounds for mental preparation
      setTimeout(() => {
        generateDuration();
        startCountdown(currentRound + 1);
      }, 1500); // 1.5s pause
    }
  };

  const handlePublishScore = async () => {
    if (!user || !profile) return;
    stopAmbientSound();

    const success = await publishScore({
      user_id: user.id,
      username: profile.username,
      experience: 'temporal',
      score: averageAccuracy,
      accuracy: averageAccuracy,
      rounds: rounds,
      created_at: new Date().toISOString(),
    });

    if (success) {
      setTimeout(() => onBack?.(), 500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {stage === 'setup' && (
        <div className="max-w-md text-center space-y-8 animate-in fade-in">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-wide text-[hsl(var(--foreground))] mb-2">
              {es ? 'Calibración Temporal' : 'Temporal Calibration'}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-light">
              {es
                ? 'Entrena tu sentido del tiempo. Mantén pulsado para igualar la duración exacta sin ver los segundos.'
                : 'Train your sense of time. Hold to match the exact duration without seeing seconds.'}
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

      {stage === 'countdown' && (
        <div className="text-center animate-in fade-in">
          <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-12">
            {es ? 'Preparándose' : 'Get ready'}
          </p>
          <div className="text-9xl font-black text-[hsl(var(--foreground))]">
            {countdownNumber}
          </div>
        </div>
      )}

      {stage === 'showing' && (
        <div className="text-center animate-in fade-in">
          <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-8">
            {es ? `Ronda ${currentRound}/${rounds} - Observa la duración` : `Round ${currentRound}/${rounds} - Observe`}
          </p>
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <style>{`
                @keyframes pulse-glow {
                  0%, 100% {
                    box-shadow: 0 0 0 0 rgba(var(--r, 255), var(--g, 255), var(--b, 255), 0.2);
                  }
                  50% {
                    box-shadow: 0 0 0 12px rgba(var(--r, 255), var(--g, 255), var(--b, 255), 0);
                  }
                }
                .pulse-circle {
                  animation: pulse-glow 2s infinite;
                }
              `}</style>
              <div className="pulse-circle w-24 h-24 rounded-full border-4 border-[hsl(var(--foreground))] flex items-center justify-center animate-pulse"
                   style={{
                     '--r': '255',
                     '--g': '255', 
                     '--b': '255',
                   } as any}>
                <span className="text-3xl">◐</span>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {es ? 'Escucha el pulso...' : 'Listen to the pulse...'}
            </p>
          </div>
        </div>
      )}

      {stage === 'responding' && (
        <div className="text-center space-y-8 animate-in fade-in">
          <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            {es ? `Ronda ${currentRound}/${rounds} - Mantén pulsado` : `Round ${currentRound}/${rounds} - Hold`}
          </p>

          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            className={`w-40 h-40 rounded-full transition-all duration-75 flex items-center justify-center text-5xl font-black mx-auto ${
              isHolding
                ? 'bg-[hsl(var(--foreground))] text-[hsl(var(--background))] scale-105 shadow-lg animate-pulse'
                : 'bg-[hsl(var(--popover))/0.5] text-[hsl(var(--foreground))] border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--foreground))]'
            }`}
            style={isHolding ? {
              boxShadow: '0 0 30px rgba(255, 255, 255, 0.5)',
              animation: 'pulse-glow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            } : {}}
          >
            ◐
          </button>

          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {es ? 'Pulsa y mantén, luego suelta' : 'Press, hold, then release'}
          </p>
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
                      {es ? 'Objetivo' : 'Target'}
                    </div>
                    <span className="text-[0.7rem] font-black text-[hsl(var(--foreground))]">
                      {(result.targetDuration / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Duración' : 'Duration'}
                    </div>
                    <span className="text-[0.7rem] font-black text-[hsl(var(--foreground))]">
                      {(result.userDuration / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Diferencia' : 'Delta'}
                    </div>
                    <span className="text-[0.7rem] font-black text-[hsl(var(--foreground))]">
                      {Math.abs(result.targetDuration - result.userDuration)}ms
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
