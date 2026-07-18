import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Lang = 'en' | 'af';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved language on app start
  useEffect(() => {
    AsyncStorage.getItem('lang').then((saved) => {
      if (saved === 'en' || saved === 'af') {
        setLangState(saved);
      }
      setIsLoaded(true);
    });
  }, []);

  // Save language when changed
  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem('lang', l);
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
export default LanguageProvider;   // ← Add this line