import type { AnalysisReport } from "../types";

interface Props {
  reports: AnalysisReport[];
  selectedId: string | null;
  onSelect: (report: AnalysisReport) => void;
}

export default function HistoryList({ reports, selectedId, onSelect }: Props) {
  return (
    <section className="panel history" aria-label="History">
      <h2>History</h2>
      {reports.length === 0 ? (
        <p className="muted">No analyses yet.</p>
      ) : (
        <ul className="history__list">
          {reports.map((r) => {
            const title =
              r.inputKind === "url"
                ? (r.source ?? "URL")
                : excerpt(r.analyzedText);
            const band = scoreBandKey(r.trustScore);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className={`history__item history__item--${band} ${
                    selectedId === r.id ? "history__item--selected" : ""
                  }`}
                  onClick={() => onSelect(r)}
                >
                  <span className={`score score--${band}`} title="Trust score">
                    {r.trustScore}
                  </span>
                  <span className="history__title">{title}</span>
                  <span className="history__time">
                    {new Date(r.createdAt).toLocaleTimeString()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function excerpt(text: string, max = 70): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function scoreBandKey(score: number): "good" | "mixed" | "caution" | "danger" {
  if (score >= 75) return "good";
  if (score >= 50) return "mixed";
  if (score >= 25) return "caution";
  return "danger";
}
