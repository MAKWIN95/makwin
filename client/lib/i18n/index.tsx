import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { translations, TranslationKey } from './translations';

type Language = keyof typeof translations;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const DEFAULT_LANGUAGE: Language = 'es';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored as Language) || DEFAULT_LANGUAGE;
  });

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key];
  }, [language]);

  const handleLanguageChange = useCallback((newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  }, []);

  const contextValue: I18nContextType = {
    language,
    setLanguage: handleLanguageChange,
    t
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}