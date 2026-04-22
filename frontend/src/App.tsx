import { useCallback, useEffect, useState } from "react";
import InputPanel from "./components/InputPanel";
import ResultsDashboard from "./components/ResultsDashboard";
import ExplanationView from "./components/ExplanationView";
import HistoryList from "./components/HistoryList";
import { ApiError, analyzeText, analyzeUrl, listReports } from "./api";
import type { AnalysisReport } from "./types";

export default function App() {
  const [current, setCurrent] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await listReports(50);
      setHistory(res.reports);
    } catch (err) {
      // Non-fatal: keep existing history, but surface the error inline so the
      // user knows why history isn't updating.
      setError(
        err instanceof ApiError
          ? `History failed: ${err.message}`
          : "History request failed.",
      );
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const onAnalyze = useCallback(
    async (kind: "text" | "url", value: string) => {
      setLoading(true);
      setError(null);
      try {
        const report =
          kind === "text" ? await analyzeText(value) : await analyzeUrl(value);
        setCurrent(report);
        await refreshHistory();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error",
        );
      } finally {
        setLoading(false);
      }
    },
    [refreshHistory],
  );

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            🛡
          </span>
          <div>
            <h1>TrustLayer</h1>
            <p className="app__tagline">
              Risk-analysis tool for digital content. Not a truth detector.
            </p>
          </div>
        </div>
        <div className="app__banner" role="note">
          TrustLayer evaluates phrasing, sourcing patterns, and risk signals.
          It does not verify facts. Always corroborate important claims with
          primary sources.
        </div>
      </header>

      <main className="app__main">
        <section className="app__col app__col--left">
          <InputPanel onSubmit={onAnalyze} loading={loading} />
          {error ? (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          ) : null}
          <HistoryList
            reports={history}
            selectedId={current?.id ?? null}
            onSelect={setCurrent}
          />
        </section>

        <section className="app__col app__col--right">
          {current ? (
            <>
              <ResultsDashboard report={current} />
              <ExplanationView report={current} />
            </>
          ) : (
            <div className="empty">
              <h2>No analysis yet</h2>
              <p>
                Paste text or a URL on the left and run an analysis. Results
                will appear here with a risk score, flagged patterns, and a
                plain-language explanation.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="app__footer">
        <span>
          TrustLayer MVP · React + Vite on Cloudflare Pages · Yandex Cloud
          Functions + YandexGPT
        </span>
      </footer>
    </div>
  );
}
