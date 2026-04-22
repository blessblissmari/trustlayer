import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import ConsentBanner from "./components/ConsentBanner";
import LanguageToggle from "./components/LanguageToggle";
import AnalyzePage from "./pages/AnalyzePage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";

export default function App() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const lang = (i18n.resolvedLanguage ?? "ru").slice(0, 2);
    document.documentElement.lang = lang;
    document.title = `${t("brand.name")} — ${t("brand.tagline")}`;
  }, [i18n.resolvedLanguage, t]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <Link to="/" className="app__brand-link">
            <span className="app__logo" aria-hidden="true">
              🛡
            </span>
            <div>
              <h1>{t("brand.name")}</h1>
              <p className="app__tagline">{t("brand.tagline")}</p>
            </div>
          </Link>
          <nav className="app__nav" aria-label="primary">
            <NavLink to="/" end>
              {t("nav.analyze")}
            </NavLink>
            <NavLink to="/terms">{t("nav.terms")}</NavLink>
            <NavLink to="/privacy">{t("nav.privacy")}</NavLink>
            <LanguageToggle />
          </nav>
        </div>
        <div className="app__banner" role="note">
          {t("banner")}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<AnalyzePage />} />
        <Route path="/terms" element={<LegalShell><TermsPage /></LegalShell>} />
        <Route path="/privacy" element={<LegalShell><PrivacyPage /></LegalShell>} />
      </Routes>

      <ConsentBanner />

      <footer className="app__footer">
        <span>{t("footer")}</span>
      </footer>
    </div>
  );
}

function LegalShell({ children }: { children: React.ReactNode }) {
  return <main className="app__main app__main--legal">{children}</main>;
}
