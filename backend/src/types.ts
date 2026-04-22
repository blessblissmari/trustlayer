// Core types shared across the backend. These are also the shape of the
// JSON responses sent to the frontend.

export type InputKind = "text" | "url";

export type Severity = "low" | "medium" | "high";

export type Lang = "ru" | "en";

export interface RiskFlag {
  /** Short machine-readable code, e.g. "absolute_claim". */
  code: string;
  /** Human-readable label shown in the UI. */
  label: string;
  severity: Severity;
  /** Optional short excerpt that triggered the flag. */
  evidence?: string;
}

export interface SuspiciousPattern {
  pattern: string;
  /** How many times this pattern was seen in the input. */
  count: number;
  severity: Severity;
  explanation: string;
}

export interface UnverifiableClaim {
  claim: string;
  /** Why this is hard to verify (e.g. "no source cited"). */
  reason: string;
}

export interface AnalysisReport {
  id: string;
  createdAt: string;
  inputKind: InputKind;
  /** For `url` inputs, the fetched URL. */
  source?: string;
  /** The text that was actually analyzed (truncated for storage/UI). */
  analyzedText: string;
  /** 0 = high risk, 100 = low risk. Never framed as "truth". */
  trustScore: number;
  riskFlags: RiskFlag[];
  suspiciousPatterns: SuspiciousPattern[];
  unverifiableClaims: UnverifiableClaim[];
  /** Short plain-language explanation for a lay reader. */
  explanation: string;
  /** Which AI backend produced the analysis ("yandex" | "mock" | "rules"). */
  aiMode: string;
  /** Standard disclaimer we attach to every report. */
  disclaimer: string;
  /** Language the localized strings in this report are rendered in. */
  lang: Lang;
}

export interface AnalyzeTextRequest {
  text: string;
  lang?: Lang;
}

export interface AnalyzeUrlRequest {
  url: string;
  lang?: Lang;
}

export interface ReportsResponse {
  reports: AnalysisReport[];
  total: number;
}

/** Output from the AI layer, before we combine it with rule-based scoring. */
export interface AiAnalysis {
  claims: string[];
  riskyPhrases: Array<{ phrase: string; reason: string; severity: Severity }>;
  unverifiableClaims: UnverifiableClaim[];
  credibility: number; // 0..100, AI's own estimate
  rationale: string;
}
