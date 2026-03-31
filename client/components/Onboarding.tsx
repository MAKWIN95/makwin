import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useI18n } from '@/lib/i18n';

type Step = {
  id: string;
  selector?: string | null;
  titleKey: string;
  descKey: string;
};

const tutorialSteps: Step[] = [
  { id: 'search', selector: '#site-search-input', titleKey: 'onboarding.search.title', descKey: 'onboarding.search.desc' },
  { id: 'lang', selector: '#lang-selector-btn', titleKey: 'onboarding.lang.title', descKey: 'onboarding.lang.desc' },
  { id: 'music', selector: '#music-btn', titleKey: 'onboarding.music.title', descKey: 'onboarding.music.desc' },
  { id: 'theme', selector: '#theme-bulb-btn', titleKey: 'onboarding.theme.title', descKey: 'onboarding.theme.desc' },
  { id: 'finish', selector: null, titleKey: 'onboarding.finish.title', descKey: 'onboarding.finish.desc' },
];

export default function Onboarding() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const popRef = useRef<HTMLDivElement>(null);
  const [popStyle, setPopStyle] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const checkAndShow = () => {
      try {
        const loc = window.location?.pathname || '/';
        const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted') === '1';
        // show onboarding only when on gallery route and not completed
        if (!hasCompletedOnboarding && loc.startsWith('/galeria')) {
          setVisible(true);
        }
      } catch (e) {
        const loc = window.location?.pathname || '/';
        if (loc.startsWith('/galeria')) setVisible(true);
      }
    };
    // run on mount
    checkAndShow();
    // also keep listening to languageSelected as fallback
    const handler = () => checkAndShow();
    window.addEventListener('languageSelected', handler);
    return () => window.removeEventListener('languageSelected', handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible) return;
    const step = tutorialSteps[stepIndex];
    const targetEl = step.selector ? document.querySelector(step.selector) as HTMLElement | null : null;

    if (targetEl?.scrollIntoView) {
      try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch (e) {}
    }

    requestAnimationFrame(() => {
      const rect = targetEl?.getBoundingClientRect();
      const popup = popRef.current;
      const popupRect = popup?.getBoundingClientRect() || { width: 320, height: 200 };

      const margin = 16;
      let top, left;
      
      if (rect) {
          // Calcular el centro ideal
          left = rect.left + window.scrollX - (popupRect.width / 2) + (rect.width / 2);
          // Asegurar que no se salga de los márgenes
          left = Math.min(Math.max(margin, left), window.innerWidth - popupRect.width - margin);
        top = rect.top + window.scrollY + rect.height + margin;
        
        if (top + popupRect.height > window.scrollY + window.innerHeight) {
          top = rect.top + window.scrollY - popupRect.height - margin;
        }
      } else {
        left = (window.innerWidth - popupRect.width) / 2;
        top = ((window.innerHeight - popupRect.height) / 2) + window.scrollY;
      }

      top = Math.max(margin + window.scrollY, Math.min(top, window.scrollY + window.innerHeight - popupRect.height - margin));
      setPopStyle({ top, left });
    });
  }, [visible, stepIndex]);

  if (!visible) return null;

  const step = tutorialSteps[stepIndex];
  const targetEl = step.selector ? document.querySelector(step.selector) as HTMLElement | null : null;
  const rect = targetEl?.getBoundingClientRect();

  return (
    <>
      {/* Overlay con blur */}
      <div className="fixed inset-0 z-[99998] pointer-events-auto">
        <div
          className="absolute inset-0 transition-all duration-150 bg-black/40 backdrop-blur-sm"
          style={{ pointerEvents: 'auto', zIndex: 99990 }}
        />
      </div>

      {/* Capa para elementos resaltados sin blur */}
      <div className="fixed inset-0 z-[99999] pointer-events-none">
        {rect && targetEl && (
          <div style={{
            position: 'absolute',
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
            zIndex: 100001,
          }}>
            {/* Fondo blanco con border radius */}
            <div className="pointer-events-none absolute"
                 style={{
                   backgroundColor: 'hsl(var(--background))',
                   borderRadius: '0.5rem',
                   zIndex: 100001,
                   top: -4,
                   left: -4,
                   right: -4,
                   bottom: -4
                 }} />
            
            {/* Elemento original */}
            <div className="pointer-events-auto relative z-[100002] flex items-center justify-center h-full"
                 dangerouslySetInnerHTML={{ __html: targetEl.outerHTML }} />
            
            {/* Highlight alrededor del elemento */}
            <div style={{
              position: 'absolute',
              top: -8,
              left: -8,
              right: -8,
              bottom: -8,
              borderRadius: 10,
              boxShadow: '0 0 0 4px rgba(255,255,255,0.9)',
              pointerEvents: 'none',
              zIndex: 100000
            }} />
          </div>
        )}
      </div>

      {/* Popover con flecha */}
      <div ref={popRef} className="fixed z-[100002] animate-in fade-in slide-in-from-bottom-4 duration-300" 
           style={{ top: popStyle.top, left: popStyle.left }}>
          <div className="relative max-w-[90vw] w-[min(400px,90vw)] bg-[hsl(var(--popover))] rounded-xl p-4 sm:p-6 shadow-2xl border border-[hsl(var(--border))] transition-all">
          {rect && (
            (() => {
              const elementCenterX = rect.left + window.scrollX + rect.width / 2;
              const popupRect = popRef.current?.getBoundingClientRect() || { width: 320 };
              const popupCenterX = popStyle.left + popupRect.width / 2;
              const arrowLeft = elementCenterX - popStyle.left;
              const isArrowPointingUp = popStyle.top > rect.top + window.scrollY;
              
              return (
                <svg viewBox="0 0 24 12" fill="currentColor" style={{
                  position: 'absolute',
                  left: `${Math.max(12, Math.min(arrowLeft, popupRect.width - 12))}px`,
                  top: isArrowPointingUp ? '-12px' : '100%',
                  transform: `translateX(-50%) rotate(${isArrowPointingUp ? '0deg' : '180deg'})`,
                  width: '24px',
                  height: '12px',
                  color: 'hsl(var(--popover))',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  zIndex: 1
                }}>
                  <path d="M12 0L24 12H0z" />
                </svg>
              );
            })()
          )}
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold tracking-tight mb-2">{t(step.titleKey as any)}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t(step.descKey as any)}</p>
            </div>
            <button 
              onClick={() => {
                try {
                  localStorage.setItem('onboardingCompleted', '1');
                } catch (e) {}
                setVisible(false);
              }} 
              className="ml-4 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors duration-200 hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              {t('onboarding.skip' as any)}
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-3">
              <button 
                disabled={stepIndex === 0} 
                onClick={() => setStepIndex(s => Math.max(0, s - 1))} 
                  className="px-4 py-2 rounded-lg text-sm bg-white text-black border border-[hsl(var(--border))] hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
              >
                {t('onboarding.prev' as any)}
              </button>
              <button 
                onClick={() => {
                  if (stepIndex + 1 >= tutorialSteps.length) {
                    try {
                      localStorage.setItem('onboardingCompleted', '1');
                    } catch (e) {}
                    setVisible(false);
                  } else setStepIndex(s => s + 1);
                }} 
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-black/90 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))]"
              >
                {stepIndex + 1 >= tutorialSteps.length ? t('onboarding.finishButton' as any) : t('onboarding.next' as any)}
              </button>
            </div>
            <div className="text-sm font-medium text-[hsl(var(--muted-foreground))]">{stepIndex + 1}/{tutorialSteps.length}</div>
          </div>
        </div>
      </div>
    </>
  );
}