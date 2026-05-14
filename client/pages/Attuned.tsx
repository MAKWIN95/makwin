import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useStarsBackground } from '@/hooks/use-stars-background';
import { useI18n } from '@/lib/i18n';
import ColorResonance from '@/components/Attuned/ColorResonance';
import TonalRecognition from '@/components/Attuned/TonalRecognition';
import TemporalCalibration from '@/components/Attuned/TemporalCalibration';
import Leaderboard from '@/components/Attuned/Leaderboard';
import { ArrowLeft } from 'lucide-react';

type ExperienceType = 'color' | 'tonal' | 'temporal' | null;

export default function Attuned() {
  const { language } = useI18n();
  const es = language === 'es';
  const [activeExperience, setActiveExperience] = useState<ExperienceType>(null);
  
  useStarsBackground('attuned-stars-background');

  const experiences = [
    {
      id: 'color',
      title: es ? 'Resonancia Cromática' : 'Color Resonance',
      description: es 
        ? 'Memoria visual. Observa un color y reconstruye su esencia con precisión.'
        : 'Visual memory. Observe a color and reconstruct its essence with precision.',
      shortDesc: es ? 'Percepción del color' : 'Color perception',
      icon: '◯'
    },
    {
      id: 'tonal',
      title: es ? 'Reconocimiento Tonal' : 'Tonal Recognition',
      description: es
        ? 'Percepción auditiva. Escucha un tono y encuentra su resonancia exacta.'
        : 'Auditory perception. Listen to a tone and find its exact resonance.',
      shortDesc: es ? 'Precisión tonal' : 'Tonal precision',
      icon: '〰'
    },
    {
      id: 'temporal',
      title: es ? 'Calibración Temporal' : 'Temporal Calibration',
      description: es
        ? 'Sentido del tiempo. Mantén pulsado para igualar la duración exacta.'
        : 'Sense of time. Hold to match the exact duration.',
      shortDesc: es ? 'Precisión temporal' : 'Temporal precision',
      icon: '◐'
    }
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] relative">
      <div id="attuned-stars-background" className="stars-background" />
      <div className="relative z-10 w-full">
        <Header showSearch={false} />

        <main className="max-w-5xl mx-auto px-4 sm:px-8 py-0 sm:py-0 page-enter">
          {/* Header Section */}
          {!activeExperience ? (
            <>
              <div className="mb-16 sm:mb-24">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-wider text-[hsl(var(--foreground))] mb-4 leading-tight">
                  ATTUNED
                </h1>
                <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] font-light max-w-3xl leading-relaxed">
                  {es
                    ? 'Laboratorio de percepción sensorial. Entrena tu agudeza visual, auditiva y temporal mediante experiencias interactivas elegantes y minimalistas.'
                    : 'Laboratory of sensory perception. Train your visual, auditory, and temporal acuity through elegant and minimalist interactive experiences.'}
                </p>
              </div>

              {/* Experiences Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {experiences.map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => setActiveExperience(exp.id as ExperienceType)}
                    className="group relative"
                  >
                    {/* Card */}
                    <div className="relative bg-[hsl(var(--popover))/0.5] backdrop-blur-md border border-[rgba(120,120,120,0.25)] rounded-2xl p-8 sm:p-10 transition-all duration-500 ease-out hover:border-[rgba(120,120,120,0.4)] hover:bg-[hsl(var(--popover))/0.7] cursor-pointer">
                      {/* Icon */}
                      <div className="mb-6 text-4xl text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors duration-300">
                        {exp.icon}
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide text-[hsl(var(--foreground))] mb-3">
                        {exp.title}
                      </h3>

                      {/* Short Description */}
                      <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] font-light mb-6 leading-relaxed">
                        {exp.description}
                      </p>

                      {/* CTA */}
                      <div className="text-xs uppercase tracking-widest text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))] transition-colors duration-300">
                        {es ? 'Iniciar' : 'Begin'} →
                      </div>

                      {/* Hover Glow */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer Info */}
              <div className="mt-20 sm:mt-32 pt-12 border-t border-[rgba(120,120,120,0.15)]">
                <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] font-light leading-relaxed max-w-2xl">
                  {es
                    ? 'Cada experiencia está diseñada para calibrar tu percepción sensorial. Responde instintivamente y descubre qué tan afinado está tu sentido artístico.'
                    : 'Each experience is designed to calibrate your sensory perception. Respond instinctively and discover how attuned your artistic sense is.'}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Active Experience Header */}
              <div className="mb-8 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  onClick={() => setActiveExperience(null)}
                  className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all duration-200 ease-out"
                >
                  <ArrowLeft className="w-5 h-5 transition-all duration-200" />
                  <span className="text-sm">{es ? 'Volver' : 'Back'}</span>
                </button>
              </div>

              {/* Experience Component */}
              <div className="rounded-2xl bg-[hsl(var(--popover))/0.3] backdrop-blur-md border border-[rgba(120,120,120,0.15)] p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeExperience === 'color' && <ColorResonance onBack={() => setActiveExperience(null)} />}
                {activeExperience === 'tonal' && <TonalRecognition onBack={() => setActiveExperience(null)} />}
                {activeExperience === 'temporal' && <TemporalCalibration onBack={() => setActiveExperience(null)} />}
              </div>

              {/* Leaderboard */}
              <div className="mt-12 rounded-2xl bg-[hsl(var(--popover))/0.3] backdrop-blur-md border border-[rgba(120,120,120,0.15)] p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: '100ms' }}>
                <Leaderboard experience={activeExperience as 'color' | 'tonal' | 'temporal'} />
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
