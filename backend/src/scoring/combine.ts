import type {
  AiAnalysis,
  AnalysisReport,
  InputKind,
  RiskFlag,
  SuspiciousPattern,
  UnverifiableClaim,
} from "../types.js";
import type { RuleOutput } from "./rules.js";

const DISCLAIMER =
  "TrustLayer is a risk-analysis tool, not a truth detector. Scores reflect phrasing and sourcing patterns, not factual accuracy. Always verify important claims with primary sources.";

export interface CombineInput {
  id: string;
  inputKind: InputKind;
  source?: string;
  analyzedText: string;
  aiAnalysis: AiAnalysis;
  rules: RuleOutput;
  aiMode: string;
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
  } = input;

  // Blend: 60% AI credibility, 40% (100 - rule penalty).
  // Both are on a 0..100 "quality" scale where higher = lower risk.
  const ruleScore = 100 - rules.penalty;
  const blended = 0.6 * aiAnalysis.credibility + 0.4 * ruleScore;
  const trustScore = Math.max(0, Math.min(100, Math.round(blended)));

  // Merge rule-based risky patterns with AI-detected risky phrases.
  const aiFlags: RiskFlag[] = aiAnalysis.riskyPhrases.map((p, i) => ({
    code: `ai_risky_${i}`,
    label: p.reason || "Risky phrasing",
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
    disclaimer: DISCLAIMER,
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
}): string {
  const { trustScore, riskFlags, unverifiableClaims, aiRationale } = args;
  const band =
    trustScore >= 75
      ? "lower-risk"
      : trustScore >= 50
        ? "mixed-risk"
        : trustScore >= 25
          ? "higher-risk"
          : "high-risk";

  const highSev = riskFlags.filter((f) => f.severity === "high").length;
  const medSev = riskFlags.filter((f) => f.severity === "medium").length;

  const parts: string[] = [];
  parts.push(
    `This content is in the ${band} band (score ${trustScore}/100). This reflects phrasing and sourcing patterns, not factual accuracy.`,
  );
  if (highSev || medSev) {
    parts.push(
      `We found ${highSev} high-severity and ${medSev} medium-severity risk signal(s) in the text.`,
    );
  } else if (riskFlags.length === 0) {
    parts.push(
      "No strong risk signals were detected, but absence of red flags does not confirm accuracy.",
    );
  }
  if (unverifiableClaims.length > 0) {
    parts.push(
      `${unverifiableClaims.length} claim(s) reference authorities or data without a verifiable source.`,
    );
  }
  if (aiRationale) parts.push(`Model rationale: ${aiRationale}`);

  return parts.join(" ");
}
