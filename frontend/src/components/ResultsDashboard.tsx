import { useTranslation } from "react-i18next";
import type { AnalysisReport, Severity } from "../types";

interface Props {
  report: AnalysisReport;
}

export default function ResultsDashboard({ report }: Props) {
  const { t } = useTranslation();
  const band = scoreBand(report.trustScore, t);

  return (
    <section className="panel results" aria-label={t("results.title")}>
      <header className="results__header">
        <div>
          <h2>{t("results.title")}</h2>
          <div className="results__meta">
            {report.inputKind === "url" && report.source ? (
              <a href={report.source} target="_blank" rel="noreferrer">
                {report.source}
              </a>
            ) : (
              <span>{t("results.text_input")}</span>
            )}
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{new Date(report.createdAt).toLocaleString()}</span>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span className={`badge badge--${report.aiMode}`}>
              {t("results.ai_badge", { mode: report.aiMode })}
            </span>
          </div>
        </div>
        <ScoreGauge score={report.trustScore} band={band} />
      </header>

      <div className="results__grid">
        <div className="card">
          <h3>{t("results.flags_title", { count: report.riskFlags.length })}</h3>
          {report.riskFlags.length === 0 ? (
            <p className="muted">{t("results.flags_empty")}</p>
          ) : (
            <ul className="flags">
              {report.riskFlags.map((f, i) => (
                <li key={i} className={`flag flag--${f.severity}`}>
                  <div className="flag__row">
                    <span className={`pill pill--${f.severity}`}>
                      {t(`severity.${f.severity}`)}
                    </span>
                    <span className="flag__label">{f.label}</span>
                  </div>
                  {f.evidence ? (
                    <code className="flag__evidence">{f.evidence}</code>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>
            {t("results.patterns_title", {
              count: report.suspiciousPatterns.length,
            })}
          </h3>
          {report.suspiciousPatterns.length === 0 ? (
            <p className="muted">{t("results.patterns_empty")}</p>
          ) : (
            <ul className="patterns">
              {report.suspiciousPatterns.map((p, i) => (
                <li key={i}>
                  <div className="patterns__row">
                    <span className={`pill pill--${p.severity}`}>
                      ×{p.count}
                    </span>
                    <strong>{p.pattern}</strong>
                  </div>
                  <p className="muted">{p.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card card--wide">
          <h3>
            {t("results.claims_title", {
              count: report.unverifiableClaims.length,
            })}
          </h3>
          {report.unverifiableClaims.length === 0 ? (
            <p className="muted">{t("results.claims_empty")}</p>
          ) : (
            <ul className="claims">
              {report.unverifiableClaims.map((c, i) => (
                <li key={i}>
                  <blockquote>“{c.claim}”</blockquote>
                  <span className="muted">{c.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ScoreGauge({ score, band }: { score: number; band: Band }) {
  const { t } = useTranslation();
  return (
    <div
      className={`gauge gauge--${band.key}`}
      role="img"
      aria-label={t("gauge_aria", { score, label: band.label })}
    >
      <div className="gauge__value">{score}</div>
      <div className="gauge__scale">/ 100</div>
      <div className="gauge__label">{band.label}</div>
    </div>
  );
}

type TFn = (key: string) => string;

interface Band {
  key: "good" | "mixed" | "caution" | "danger";
  label: string;
  severity: Severity;
}

function scoreBand(score: number, t: TFn): Band {
  if (score >= 75)
    return { key: "good", label: t("band.good"), severity: "low" };
  if (score >= 50)
    return { key: "mixed", label: t("band.mixed"), severity: "medium" };
  if (score >= 25)
    return { key: "caution", label: t("band.caution"), severity: "medium" };
  return { key: "danger", label: t("band.danger"), severity: "high" };
}
