import { DISCLAIMER, UI } from "../i18n.js";
import type {
  AiAnalysis,
  AnalysisReport,
  InputKind,
  Lang,
  RiskFlag,
  SuspiciousPattern,
  UnverifiableClaim,
} from "../types.js";
import type { RuleOutput } from "./rules.js";

export interface CombineInput {
  id: string;
  inputKind: InputKind;
  source?: string;
  analyzedText: string;
  aiAnalysis: AiAnalysis;
  rules: RuleOutput;
  aiMode: string;
  lang: Lang;
}

export function combineReport(input: CombineInput): AnalysisReport {
  const {
    id,
    inputKind,
    source,
    analyzedText,
    aiAnalysis,
    rules,
    aiMode,
    lang,
  } = input;

  // Blend: 60% AI credibility, 40% (100 - rule penalty).
  // Both are on a 0..100 "quality" scale where higher = lower risk.
  const ruleScore = 100 - rules.penalty;
  const blended = 0.6 * aiAnalysis.credibility + 0.4 * ruleScore;
  const trustScore = Math.max(0, Math.min(100, Math.round(blended)));

  // Merge rule-based risky patterns with AI-detected risky phrases.
  const riskyPhrasingFallback = UI[lang].riskyPhrasing;
  const aiFlags: RiskFlag[] = aiAnalysis.riskyPhrases.map((p, i) => ({
    code: `ai_risky_${i}`,
    label: p.reason || riskyPhrasingFallback,
    severity: p.severity,
    evidence: p.phrase,
  }));

  const riskFlags: RiskFlag[] = dedupeFlags([...rules.flags, ...aiFlags]);

  const suspiciousPatterns: SuspiciousPattern[] = rules.patterns;

  const unverifiableClaims: UnverifiableClaim[] = dedupeClaims(
    aiAnalysis.unverifiableClaims,
  );

  const explanation = buildExplanation({
    trustScore,
    riskFlags,
    unverifiableClaims,
    aiRationale: aiAnalysis.rationale,
    lang,
  });

  return {
    id,
    createdAt: new Date().toISOString(),
    inputKind,
    source,
    analyzedText,
    trustScore,
    riskFlags,
    suspiciousPatterns,
    unverifiableClaims,
    explanation,
    aiMode,
    disclaimer: DISCLAIMER[lang],
    lang,
  };
}

function dedupeFlags(flags: RiskFlag[]): RiskFlag[] {
  const seen = new Set<string>();
  const out: RiskFlag[] = [];
  for (const f of flags) {
    const key = `${f.code}:${(f.evidence ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.slice(0, 25);
}

function dedupeClaims(claims: UnverifiableClaim[]): UnverifiableClaim[] {
  const seen = new Set<string>();
  const out: UnverifiableClaim[] = [];
  for (const c of claims) {
    const key = c.claim.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.slice(0, 10);
}

function buildExplanation(args: {
  trustScore: number;
  riskFlags: RiskFlag[];
  unverifiableClaims: UnverifiableClaim[];
  aiRationale: string;
  lang: Lang;
}): string {
  const { trustScore, riskFlags, unverifiableClaims, aiRationale, lang } = args;
  const bandKey =
    trustScore >= 75
      ? "lower-risk"
      : trustScore >= 50
        ? "mixed-risk"
        : trustScore >= 25
          ? "higher-risk"
          : "high-risk";

  const t = UI[lang];
  const band = t.bandLabel(bandKey as "lower-risk" | "mixed-risk" | "higher-risk" | "high-risk");

  const highSev = riskFlags.filter((f) => f.severity === "high").length;
  const medSev = riskFlags.filter((f) => f.severity === "medium").length;

  const parts: string[] = [];
  parts.push(t.explanationHeadline(band, trustScore));
  if (highSev || medSev) {
    parts.push(t.signalCounts(highSev, medSev));
  } else if (riskFlags.length === 0) {
    parts.push(t.noSignals);
  }
  if (unverifiableClaims.length > 0) {
    parts.push(t.unverifiableClaimsCount(unverifiableClaims.length));
  }
  if (aiRationale) parts.push(`${t.modelRationalePrefix} ${aiRationale}`);

  return parts.join(" ");
}
