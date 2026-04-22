// Mirrors backend/src/types.ts. We duplicate instead of sharing at build time
// so each workspace can be typechecked / deployed independently.

export type Severity = "low" | "medium" | "high";
export type InputKind = "text" | "url";

export interface RiskFlag {
  code: string;
  label: string;
  severity: Severity;
  evidence?: string;
}

export interface SuspiciousPattern {
  pattern: string;
  count: number;
  severity: Severity;
  explanation: string;
}

export interface UnverifiableClaim {
  claim: string;
  reason: string;
}

export interface AnalysisReport {
  id: string;
  createdAt: string;
  inputKind: InputKind;
  source?: string;
  analyzedText: string;
  trustScore: number;
  riskFlags: RiskFlag[];
  suspiciousPatterns: SuspiciousPattern[];
  unverifiableClaims: UnverifiableClaim[];
  explanation: string;
  aiMode: string;
  disclaimer: string;
}

export interface ReportsResponse {
  reports: AnalysisReport[];
  total: number;
}
