import { useState } from "react";
import type { AnalysisReport } from "../types";

interface Props {
  report: AnalysisReport;
}

export default function ExplanationView({ report }: Props) {
  const [showText, setShowText] = useState(false);

  return (
    <section className="panel explanation" aria-label="Explanation">
      <h2>Explanation</h2>
      <p className="explanation__body">{report.explanation}</p>

      <details
        className="explanation__raw"
        open={showText}
        onToggle={(e) => setShowText((e.target as HTMLDetailsElement).open)}
      >
        <summary>
          {showText ? "Hide" : "Show"} analyzed text (
          {report.analyzedText.length.toLocaleString()} chars)
        </summary>
        <pre>{report.analyzedText}</pre>
      </details>

      <p className="explanation__disclaimer">{report.disclaimer}</p>
    </section>
  );
}
