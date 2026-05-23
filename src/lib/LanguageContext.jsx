import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'nutriai_language';
const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'uk';
  } catch {
    return 'uk';
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'uk';
  }, [language]);

  const value = useMemo(() => {
    const setLanguage = (nextLanguage) => {
      const normalized = nextLanguage === 'en' ? 'en' : 'uk';
      setLanguageState(normalized);
      localStorage.setItem(STORAGE_KEY, normalized);
      document.documentElement.lang = normalized === 'en' ? 'en' : 'uk';
    };

    return {
      language,
      isEnglish: language === 'en',
      setLanguage,
      text: (uk, en) => (language === 'en' ? en : uk),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
