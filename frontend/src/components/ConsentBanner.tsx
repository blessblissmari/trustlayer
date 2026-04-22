import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const STORAGE_KEY = "trustlayer.consent";

export default function ConsentBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) !== null);
    } catch {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  const persist = (value: "accepted" | "declined") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // If storage is unavailable, still dismiss locally so the banner
      // doesn't loop. We don't rely on the stored value for functionality.
    }
    setDismissed(true);
  };

  return (
    <div className="consent" role="dialog" aria-live="polite">
      <div className="consent__text">
        <strong>{t("consent.title")}</strong>
        <p>
          <Trans
            i18nKey="consent.body"
            components={{
              1: <Link to="/terms" />,
              3: <Link to="/privacy" />,
            }}
          />
        </p>
      </div>
      <div className="consent__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => persist("declined")}
        >
          {t("consent.decline")}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => persist("accepted")}
        >
          {t("consent.accept")}
        </button>
      </div>
    </div>
  );
}
