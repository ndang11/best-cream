import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as FileSystem from 'expo-file-system';
import { Language, translations, TranslationKey } from '../utils/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => translations.en[key] || key,
});

const LANG_STORAGE_FILE = `${FileSystem.documentDirectory || ''}best_cream_lang.txt`;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load persisted language choice on mount
  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        if (!FileSystem.documentDirectory) return;
        const fileInfo = await FileSystem.getInfoAsync(LANG_STORAGE_FILE);
        if (fileInfo.exists) {
          const savedLang = (await FileSystem.readAsStringAsync(LANG_STORAGE_FILE)).trim();
          if (savedLang === 'en' || savedLang === 'fr') {
            setLanguageState(savedLang);
          }
        }
      } catch (err) {
        // Silently default to English
      }
    }
    loadSavedLanguage();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (FileSystem.documentDirectory) {
      FileSystem.writeAsStringAsync(LANG_STORAGE_FILE, lang).catch(() => {});
    }
  };

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
