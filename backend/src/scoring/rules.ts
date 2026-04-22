import type { RiskFlag, Severity, SuspiciousPattern } from "../types.js";

// Pure rule-based signals. Run on every request, regardless of AI mode, and
// combined with the AI output in combine.ts. Kept simple so a human can audit
// why the score came out the way it did.

interface PatternDef {
  code: string;
  label: string;
  re: RegExp;
  severity: Severity;
  explanation: string;
}

const PATTERNS: PatternDef[] = [
  {
    code: "absolute_claim",
    label: "Absolute certainty phrasing",
    re: /\b(100% (guaranteed|proven|true|false)|absolutely (true|false)|undeniable proof|scientifically proven)\b/gi,
    severity: "high",
    explanation:
      "Phrases asserting absolute certainty are rare in well-sourced reporting.",
  },
  {
    code: "clickbait_health",
    label: "Clickbait / health-miracle phrasing",
    re: /\b(miracle cure|one weird trick|doctors hate|secret (method|trick|formula)|big pharma doesn't want)\b/gi,
    severity: "high",
    explanation:
      "Phrasing strongly associated with health misinformation and clickbait.",
  },
  {
    code: "conspiracy_framing",
    label: "Conspiracy framing",
    re: /\b(they don't want you to know|the (mainstream )?media is hiding|wake up sheeple|do your own research)\b/gi,
    severity: "medium",
    explanation: "Framing that positions the reader against unnamed actors.",
  },
  {
    code: "unnamed_authority",
    label: "Appeal to unnamed authority",
    re: /\b(studies show|experts say|scientists confirm|research proves|data shows)\b(?![^.]*\bhttps?:\/\/)/gi,
    severity: "medium",
    explanation:
      "Cites 'studies' or 'experts' without naming them or linking to a source.",
  },
  {
    code: "urgency_pressure",
    label: "Urgency / pressure tactics",
    re: /\b(act now|limited time|urgent|don't wait|last chance|only today)\b/gi,
    severity: "low",
    explanation: "Pressure tactics that can reduce careful evaluation.",
  },
  {
    code: "excessive_caps",
    label: "Excessive ALL-CAPS",
    re: /\b[A-Z]{6,}\b/g,
    severity: "low",
    explanation: "Long all-caps runs often indicate emotional framing.",
  },
  {
    code: "excessive_exclaim",
    label: "Excessive exclamation marks",
    re: /!{3,}/g,
    severity: "low",
    explanation: "Heavy punctuation often correlates with low-quality content.",
  },
];

export interface RuleOutput {
  flags: RiskFlag[];
  patterns: SuspiciousPattern[];
  /** Penalty to subtract from a baseline trust score, 0..100. */
  penalty: number;
}

export function applyRules(text: string): RuleOutput {
  const flags: RiskFlag[] = [];
  const patterns: SuspiciousPattern[] = [];
  let penalty = 0;

  for (const p of PATTERNS) {
    const matches = text.match(p.re);
    if (!matches || matches.length === 0) continue;

    const count = matches.length;
    const evidence = matches[0]?.slice(0, 120);

    flags.push({
      code: p.code,
      label: p.label,
      severity: p.severity,
      evidence,
    });

    patterns.push({
      pattern: p.label,
      count,
      severity: p.severity,
      explanation: p.explanation,
    });

    // Diminishing returns so one spammy input doesn't drive the score to 0
    // on a single pattern alone.
    const per = p.severity === "high" ? 18 : p.severity === "medium" ? 10 : 4;
    penalty += per + Math.min(count - 1, 3) * Math.ceil(per / 3);
  }

  // Tiny inputs are inherently low-signal.
  if (text.trim().length < 40) {
    flags.push({
      code: "input_too_short",
      label: "Input too short for meaningful analysis",
      severity: "low",
      evidence: text.trim().slice(0, 60),
    });
    penalty += 10;
  }

  return { flags, patterns, penalty: Math.min(penalty, 100) };
}
