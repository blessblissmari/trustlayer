import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import InputPanel from "../components/InputPanel";
import ResultsDashboard from "../components/ResultsDashboard";
import ExplanationView from "../components/ExplanationView";
import HistoryList from "../components/HistoryList";
import { ApiError, analyzeText, analyzeUrl, listReports } from "../api";
import { currentLang } from "../i18n";
import type { AnalysisReport } from "../types";

export default function AnalyzePage() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await listReports(50);
      setHistory(res.reports);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? t("alert.history_failed", { message: err.message })
          : t("alert.history_generic"),
      );
    }
  }, [t]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const onAnalyze = useCallback(
    async (kind: "text" | "url", value: string) => {
      setLoading(true);
      setError(null);
      try {
        const lang = currentLang();
        const report =
          kind === "text"
            ? await analyzeText(value, lang)
            : await analyzeUrl(value, lang);
        setCurrent(report);
        await refreshHistory();
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : t("alert.unknown_error"),
        );
      } finally {
        setLoading(false);
      }
    },
    [refreshHistory, t],
  );

  return (
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
            <h2>{t("empty.title")}</h2>
            <p>{t("empty.body")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
