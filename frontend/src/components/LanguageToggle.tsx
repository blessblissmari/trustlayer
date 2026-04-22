import { useTranslation } from "react-i18next";
import type { Lang } from "../i18n";
import { SUPPORTED_LANGS } from "../i18n";

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "ru").slice(
    0,
    2,
  ) as Lang;

  return (
    <div className="lang-toggle" role="group" aria-label={t("nav.language")}>
      {SUPPORTED_LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-toggle__btn ${
            current === code ? "lang-toggle__btn--active" : ""
          }`}
          aria-pressed={current === code}
          onClick={() => void i18n.changeLanguage(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
