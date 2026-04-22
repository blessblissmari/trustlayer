import type { AnalysisReport, Severity } from "../types";

interface Props {
  report: AnalysisReport;
}

export default function ResultsDashboard({ report }: Props) {
  const band = scoreBand(report.trustScore);

  return (
    <section className="panel results" aria-label="Analysis results">
      <header className="results__header">
        <div>
          <h2>Risk analysis</h2>
          <div className="results__meta">
            {report.inputKind === "url" && report.source ? (
              <a href={report.source} target="_blank" rel="noreferrer">
                {report.source}
              </a>
            ) : (
              <span>Text input</span>
            )}
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{new Date(report.createdAt).toLocaleString()}</span>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span className={`badge badge--${report.aiMode}`}>
              AI: {report.aiMode}
            </span>
          </div>
        </div>
        <ScoreGauge score={report.trustScore} band={band} />
      </header>

      <div className="results__grid">
        <div className="card">
          <h3>Risk flags ({report.riskFlags.length})</h3>
          {report.riskFlags.length === 0 ? (
            <p className="muted">No risk flags raised.</p>
          ) : (
            <ul className="flags">
              {report.riskFlags.map((f, i) => (
                <li key={i} className={`flag flag--${f.severity}`}>
                  <div className="flag__row">
                    <span className={`pill pill--${f.severity}`}>
                      {f.severity}
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
          <h3>Suspicious patterns ({report.suspiciousPatterns.length})</h3>
          {report.suspiciousPatterns.length === 0 ? (
            <p className="muted">None detected.</p>
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
          <h3>Unverifiable claims ({report.unverifiableClaims.length})</h3>
          {report.unverifiableClaims.length === 0 ? (
            <p className="muted">
              No unverifiable claims were identified. This does not mean the
              content is verified — just that no unsourced authority appeals
              were detected.
            </p>
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
  return (
    <div className={`gauge gauge--${band.key}`} role="img" aria-label={`Risk score ${score} of 100, ${band.label}`}>
      <div className="gauge__value">{score}</div>
      <div className="gauge__scale">/ 100</div>
      <div className="gauge__label">{band.label}</div>
    </div>
  );
}

interface Band {
  key: "good" | "mixed" | "caution" | "danger";
  label: string;
  severity: Severity;
}

function scoreBand(score: number): Band {
  if (score >= 75)
    return { key: "good", label: "Lower risk", severity: "low" };
  if (score >= 50)
    return { key: "mixed", label: "Mixed risk", severity: "medium" };
  if (score >= 25)
    return { key: "caution", label: "Higher risk", severity: "medium" };
  return { key: "danger", label: "High risk", severity: "high" };
}
