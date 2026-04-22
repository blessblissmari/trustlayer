import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AnalysisReport } from "../types";

interface Props {
  report: AnalysisReport;
}

export default function ExplanationView({ report }: Props) {
  const { t } = useTranslation();
  const [showText, setShowText] = useState(false);

  return (
    <section className="panel explanation" aria-label={t("explanation.title")}>
      <h2>{t("explanation.title")}</h2>
      <p className="explanation__body">{report.explanation}</p>

      <details
        className="explanation__raw"
        open={showText}
        onToggle={(e) => setShowText((e.target as HTMLDetailsElement).open)}
      >
        <summary>
          {showText
            ? t("explanation.hide_text", { count: report.analyzedText.length })
            : t("explanation.show_text", { count: report.analyzedText.length })}
        </summary>
        <pre>{report.analyzedText}</pre>
      </details>

      <p className="explanation__disclaimer">{report.disclaimer}</p>
    </section>
  );
}
