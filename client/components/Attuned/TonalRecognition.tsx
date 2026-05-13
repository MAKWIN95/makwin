import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useAttune } from '@/lib/AttuneContext';
import { Share2 } from 'lucide-react';

type Stage = 'setup' | 'listening' | 'responding' | 'result';

interface RoundResult {
  targetFreq: number;
  userFreq: number;
  accuracy: number;
}

export default function TonalRecognition({ onBack }: { onBack?: () => void }) {
  const { language } = useI18n();
  const { user, profile } = useAuth();
  const { setTempScore, publishScore } = useAttune();
  const es = language === 'es';
  
  const [stage, setStage] = useState<Stage>('setup');
  const [rounds, setRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [targetFreq, setTargetFreq] = useState(0);
  const [userFreq, setUserFreq] = useState(440);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [averageAccuracy, setAverageAccuracy] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const keyboardToneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    return () => stopTone();
  }, []);

  // Keyboard precision control during responding stage
  useEffect(() => {
    if (stage !== 'responding') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); // Prevent page scroll
        
        const step = 1;
        const newFreq = e.key === 'ArrowUp' 
          ? Math.min(userFreq + step, 1000)
          : Math.max(userFreq - step, 100);
        
        setUserFreq(newFreq);
        playToneRealtime(newFreq);
        
        // Clear existing timeout and set new one for 3s auto fade-out
        if (keyboardToneTimeoutRef.current) clearTimeout(keyboardToneTimeoutRef.current);
        keyboardToneTimeoutRef.current = setTimeout(() => {
          stopTone();
        }, 3000);
      }
    };

    // Use capture phase to ensure we catch ALL keydown events
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (keyboardToneTimeoutRef.current) clearTimeout(keyboardToneTimeoutRef.current);
      stopTone();
    };
  }, [stage, userFreq]);

  const playTone = (freq: number, duration: number = 1000) => {
    try {
      stopTone(); // Ensure previous tone is stopped
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;

      // Ensure context is running
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.error('[Tonal] Resume failed:', e));
      }

      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      oscillator.connect(gain);
      gain.connect(audioCtx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      // Clean fade in/out
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.2, now + (duration / 1000) - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + (duration / 1000));

      oscillator.start(now);
      oscillator.stop(now + (duration / 1000));

      oscillatorRef.current = oscillator;
      gainRef.current = gain;
    } catch (e) {
      console.error('[Tonal] Tone play error:', e);
    }
  };

  const playToneRealtime = (freq: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioCtx = audioContextRef.current;
      
      // Resume if suspended
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.error('[Tonal] Resume failed:', e));
      }

      // Create new oscillator if doesn't exist
      if (!oscillatorRef.current || !gainRef.current) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        gain.gain.value = 0.2;
        osc.start(audioCtx.currentTime);
        oscillatorRef.current = osc;
        gainRef.current = gain;
      }

      // Update frequency smoothly
      if (oscillatorRef.current && audioCtx.state === 'running') {
        oscillatorRef.current.frequency.setTargetAtTime(
          freq,
          audioCtx.currentTime,
          0.01 // time constant for exponential ramp
        );
      }
    } catch (e) {
      console.error('[Tonal] Realtime tone error:', e);
    }
  };

  const stopTone = () => {
    try {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch (e) {
          // Oscillator might already be stopped
        }
        oscillatorRef.current = null;
      }
      
      if (gainRef.current && audioContextRef.current) {
        try {
          gainRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        } catch (e) {
          // Gain node might be disconnected
        }
        gainRef.current = null;
      }
    } catch (e) {
      console.error('[Tonal] Stop tone error:', e);
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

  const generateFreq = () => {
    setTargetFreq(Math.floor(Math.random() * 400) + 200);
    setUserFreq(440);
  };

  const calculateAccuracy = () => {
    const diff = Math.abs(userFreq - targetFreq);
    const maxDiff = 300;
    return Math.max(0, Math.round(100 - (diff / maxDiff) * 100));
  };

  const initAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Ensure audio context is running (unlock)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      return audioContextRef.current;
    } catch (e) {
      console.error('AudioContext init error:', e);
      return null;
    }
  };

  const handleStartExperience = async () => {
    await initAudioContext();
    generateFreq();
    setStage('listening');
    playTone(targetFreq, 1500);
    setTimeout(() => setStage('responding'), 2000);
  };

  const handleSubmitRound = () => {
    const acc = calculateAccuracy();
    const newResult: RoundResult = {
      targetFreq,
      userFreq,
      accuracy: acc,
    };

    setResults([...results, newResult]);
    stopTone();

    if (currentRound >= rounds) {
      setStage('result');
    } else {
      setCurrentRound(currentRound + 1);
      generateFreq();
      setStage('listening');
      playTone(targetFreq, 1500);
      setTimeout(() => setStage('responding'), 2000);
    }
  };

  const handlePublishScore = async () => {
    if (!user || !profile) return;
    stopTone();

    const success = await publishScore({
      user_id: user.id,
      username: profile.username,
      experience: 'tonal',
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
              {es ? 'Reconocimiento Tonal' : 'Tonal Recognition'}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] font-light">
              {es
                ? 'Escucha un tono y encuentra su frecuencia exacta con máxima precisión.'
                : 'Listen to a tone and find its exact frequency with precision.'}
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

      {stage === 'listening' && (
        <div className="text-center animate-in fade-in">
          <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-8">
            {es ? `Ronda ${currentRound}/${rounds} - Escucha` : `Round ${currentRound}/${rounds} - Listen`}
          </p>
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto rounded-full border-4 border-[hsl(var(--foreground))] flex items-center justify-center animate-pulse">
              <span className="text-3xl">〰</span>
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {es ? 'Preparándose...' : 'Preparing...'}
          </p>
        </div>
      )}

      {stage === 'responding' && (
        <div className="max-w-2xl w-full animate-in fade-in">
          <p className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-8 text-center">
            {es ? `Ronda ${currentRound}/${rounds} - Ajusta el slider` : `Round ${currentRound}/${rounds} - Adjust`}
          </p>

          <div className="space-y-8">
            <div className="text-center">
              <p className="text-4xl font-black text-[hsl(var(--foreground))] mb-2">
                {userFreq} Hz
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mb-6">
                {userFreq < 300 && (es ? 'Grave' : 'Deep')}
                {userFreq >= 300 && userFreq < 500 && (es ? 'Medio' : 'Mid')}
                {userFreq >= 500 && (es ? 'Agudo' : 'High')}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] font-light">
                {es ? 'Usa ← → para ajuste fino' : 'Use ← → for fine tuning'}
              </p>
            </div>

            <div>
              {/* Minimal frequency visualizer */}
              <div className="mb-6 flex items-end justify-center gap-1 h-12 opacity-60">
                {Array.from({ length: 8 }).map((_, i) => {
                  const barHeight = Math.max(
                    20,
                    ((userFreq - 100) / 900) * 40 + (Math.sin(i * 0.5) * 10)
                  );
                  return (
                    <div
                      key={i}
                      className="w-1 bg-[hsl(var(--foreground))] rounded-sm transition-all duration-75"
                      style={{
                        height: `${barHeight}px`,
                        opacity: 0.4 + (i / 8) * 0.5,
                      }}
                    />
                  );
                })}
              </div>

              <input
                type="range"
                min="100"
                max="1000"
                value={userFreq}
                onChange={(e) => {
                  const freq = parseInt(e.target.value);
                  setUserFreq(freq);
                  playToneRealtime(freq);
                  
                  // Reset keyboard timeout when slider is moved
                  if (keyboardToneTimeoutRef.current) {
                    clearTimeout(keyboardToneTimeoutRef.current);
                  }
                }}
                onMouseDown={() => {
                  // Ensure audio context is active
                  if (audioContextRef.current?.state === 'suspended') {
                    audioContextRef.current.resume();
                  }
                }}
                onMouseUp={stopTone}
                onTouchStart={() => {
                  // Ensure audio context is active
                  if (audioContextRef.current?.state === 'suspended') {
                    audioContextRef.current.resume();
                  }
                }}
                onTouchEnd={stopTone}
                className="w-full h-2 rounded-full appearance-none cursor-pointer transition-all duration-200 focus:outline-none"
                style={{
                  background: `linear-gradient(to right, rgb(40, 40, 40), rgb(200, 200, 200))`,
                  WebkitAppearance: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                } as any}
              />
              <style>{`
                input[type='range']::-webkit-slider-thumb {
                  appearance: none;
                  width: 2px;
                  height: 24px;
                  border-radius: 1px;
                  background: white;
                  cursor: pointer;
                  box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
                  -webkit-touch-callout: none;
                }
                input[type='range']::-webkit-slider-thumb:active {
                  box-shadow: 0 0 12px rgba(255, 255, 255, 0.9);
                }
                input[type='range']::-moz-range-thumb {
                  width: 2px;
                  height: 24px;
                  border-radius: 1px;
                  background: white;
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
                }
                input[type='range']::-moz-range-thumb:active {
                  box-shadow: 0 0 12px rgba(255, 255, 255, 0.9);
                }
                input[type='range']:focus {
                  outline: none;
                }
              `}</style>
              <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mt-2">
                <span>100 Hz</span>
                <span>1000 Hz</span>
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
                <div className="grid grid-cols-2 gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Objetivo' : 'Target'}
                    </div>
                    <span className="text-[0.7rem] font-black text-[hsl(var(--foreground))]">
                      {result.targetFreq} Hz
                    </span>
                  </div>
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Tu respuesta' : 'Your answer'}
                    </div>
                    <span className="text-[0.7rem] font-black text-[hsl(var(--foreground))]">
                      {result.userFreq} Hz
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[0.65rem] uppercase tracking-wider font-black mb-1">
                      {es ? 'Diferencia' : 'Difference'}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[hsl(var(--foreground))]"
                          style={{
                            width: `${result.accuracy}%`
                          }}
                        />
                      </div>
                      <span className="text-[0.7rem]">
                        {Math.abs(result.targetFreq - result.userFreq)} Hz
                      </span>
                    </div>
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
