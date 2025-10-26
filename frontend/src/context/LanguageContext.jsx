import { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n, {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from "../i18n/config.js";

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  languages: SUPPORTED_LANGUAGES,
  setLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE;
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
      return stored;
    }
    return DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    if (!SUPPORTED_LANGUAGES.some((lang) => lang.code === language)) {
      setLanguage(DEFAULT_LANGUAGE);
      return;
    }
    if (i18n.language !== language) {
      i18n.changeLanguage(language).catch(() => {});
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", language);
    }
  }, [language]);

  useEffect(() => {
    const handler = (lng) => {
      if (lng !== language) {
        setLanguage(lng);
      }
    };
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      languages: SUPPORTED_LANGUAGES,
      setLanguage,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
