import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import tr from "./locales/tr.json";
import en from "./locales/en.json";
import de from "./locales/de.json";

export const SUPPORTED_LANGUAGES = [
  { code: "tr", label: tr.common.language.turkish },
  { code: "en", label: en.common.language.english },
  { code: "de", label: de.common.language.german }
];

export const DEFAULT_LANGUAGE = "tr";
export const LANGUAGE_STORAGE_KEY = "ayyildiz-lang";

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de }
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });
}

export default i18n;
