import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ru from "./ru.json";

export type Lang = "ru" | "en";

export const SUPPORTED_LANGS: Lang[] = ["ru", "en"];

// Russian default because the primary initial audience is RU-speaking.
// Users can switch in the header; choice is persisted in localStorage by
// the LanguageDetector.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    fallbackLng: "ru",
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "trustlayer.lang",
      caches: ["localStorage"],
    },
  });

export function currentLang(): Lang {
  const raw = (i18n.resolvedLanguage ?? i18n.language ?? "ru").slice(0, 2);
  return raw === "en" ? "en" : "ru";
}

export default i18n;
