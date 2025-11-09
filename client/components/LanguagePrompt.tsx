import React, { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

export default function LanguagePrompt() {
  const { setLanguage } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mostrar el prompt de idioma solo si no se ha seleccionado antes
    try {
      const hasSelectedLanguage = localStorage.getItem('languageSelected') === '1';
      if (!hasSelectedLanguage) {
        setVisible(true);
      } else {
        // Si ya se seleccionó idioma antes, disparar el evento para que el onboarding sepa que puede mostrarse
        // (si es su primera vez)
        window.dispatchEvent(new Event('languageSelected'));
      }
    } catch (e) {
      // Si hay algún error con localStorage (ej: modo privado), mostrar siempre
      setVisible(true);
    }
  }, []);

  const selectLanguage = (lang: 'en' | 'es') => {
    // First change language so translations are ready for the tutorial
    setLanguage(lang);
    try {
      localStorage.setItem('languageSelected', '1');
    } catch (e) {}
    // notify other parts of the app (same-window) BEFORE hiding so onboarding can render underneath
    try { window.dispatchEvent(new Event('languageSelected')); } catch (e) { /* noop */ }
    // hide the prompt (onboarding will appear immediately underneath)
    setVisible(false);
  };

  if (!visible) return null;

  return (
    // lowered z so onboarding (which appears after selection) can render above and avoid flicker
    <div className="fixed inset-0 z-[99980] flex items-center justify-center pointer-events-auto">
      {/* Darkened backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Glass-style modal */}
      <div className="relative z-10 max-w-sm w-full mx-4">
        <div className="glass-effect p-6 rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.12)]">
          <div className="text-center space-y-6">
              <h2 className="text-2xl font-semibold">seleccionar idioma / select language</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Escoge tu idioma favorito para empezar / Choose your preferred language to start.</p>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => selectLanguage('en')}
                  className="px-6 py-3 rounded-lg bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-white/10 hover:scale-[1.02] transition-all shadow-sm"
                >
                  English
                </button>
                <button
                  onClick={() => selectLanguage('es')}
                  className="px-6 py-3 rounded-lg bg-white/5 border border-gray-200 dark:border-gray-700 hover:bg-white/10 hover:scale-[1.02] transition-all shadow-sm"
                >
                  Español
                </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}