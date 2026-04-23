import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ApiError, getQuota, listReports, type QuotaState } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { AnalysisReport } from "../types";

export default function AccountPage() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();

  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getQuota(), listReports(50)])
      .then(([q, r]) => {
        if (cancelled) return;
        setQuota(q);
        setReports(r.reports);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : String(e),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dtFmt = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "ru", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="app__main app__main--account">
      <section className="account">
        <header className="account__header">
          <h2>{t("account.title")}</h2>
          <p className="muted">{user?.email}</p>
        </header>

        <div className="account__quota">
          <h3>{t("account.quota_title")}</h3>
          {quota ? (
            <>
              <p>
                {t("account.quota_used", {
                  used: quota.used,
                  max: quota.maxPerDay,
                })}
              </p>
              <div
                className="quota-bar"
                role="progressbar"
                aria-valuenow={quota.used}
                aria-valuemin={0}
                aria-valuemax={quota.maxPerDay}
              >
                <div
                  className="quota-bar__fill"
                  style={{
                    width: `${Math.min(100, (quota.used / Math.max(quota.maxPerDay, 1)) * 100)}%`,
                  }}
                />
              </div>
            </>
          ) : loading ? (
            <p className="muted">…</p>
          ) : (
            <p className="muted">—</p>
          )}
        </div>

        <div className="account__history">
          <h3>{t("account.history_title")}</h3>
          {error && <p className="auth-card__error">{error}</p>}
          {loading && !error && <p className="muted">…</p>}
          {!loading && !error && reports.length === 0 && (
            <p className="muted">{t("account.history_empty")}</p>
          )}
          <ul className="history">
            {reports.map((r) => (
              <li key={r.id} className="history__item">
                <span className={`history__score history__score--${scoreClass(r.trustScore)}`}>
                  {r.trustScore}
                </span>
                <div className="history__meta">
                  <span className="history__kind">
                    {r.inputKind === "text"
                      ? t("history.kind_text")
                      : t("history.kind_url")}
                  </span>
                  <span className="history__date">
                    {dtFmt.format(new Date(r.createdAt))}
                  </span>
                </div>
                <span className="history__preview">
                  {(r.source ?? r.analyzedText).slice(0, 80)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="account__actions">
          <Link to="/" className="btn btn--primary">
            {t("account.run_analysis")}
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
            {t("auth.logout")}
          </button>
        </div>
      </section>
    </main>
  );
}

function scoreClass(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
