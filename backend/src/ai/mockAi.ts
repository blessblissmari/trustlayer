import type { AiAnalysis, Severity } from "../types.js";

// Deterministic mock so the whole stack runs offline with no credentials.
// It's intentionally naive; it exists to unblock frontend dev and tests,
// NOT to make real credibility judgments.
export async function mockAnalyze(text: string): Promise<AiAnalysis> {
  const riskyPatterns: Array<{
    re: RegExp;
    reason: string;
    severity: Severity;
  }> = [
    {
      re: /\b(100% (guaranteed|proven)|absolutely (true|false)|undeniable proof)\b/gi,
      reason: "Absolute certainty language with no cited source.",
      severity: "high",
    },
    {
      re: /\b(miracle cure|secret (method|trick)|doctors hate)\b/gi,
      reason: "Classic clickbait / health-misinformation phrasing.",
      severity: "high",
    },
    {
      re: /\b(they don't want you to know|the (mainstream )?media is hiding|wake up)\b/gi,
      reason: "Conspiracy framing.",
      severity: "medium",
    },
    {
      re: /\b(studies show|experts say|scientists confirm)\b/gi,
      reason: "Appeal to unnamed authority.",
      severity: "medium",
    },
    {
      re: /\b(act now|limited time|urgent|don't wait)\b/gi,
      reason: "Urgency / pressure tactics.",
      severity: "low",
    },
  ];

  const riskyPhrases: AiAnalysis["riskyPhrases"] = [];
  for (const p of riskyPatterns) {
    const matches = text.match(p.re);
    if (!matches) continue;
    for (const m of new Set(matches.map((s) => s.toLowerCase()))) {
      riskyPhrases.push({ phrase: m, reason: p.reason, severity: p.severity });
    }
  }

  // Very crude "claim extraction": split into sentences and keep ones that
  // look like factual statements (contain numbers, named entities heuristic,
  // or strong assertions).
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 400);

  const claimsSet = new Set<string>();
  for (const s of sentences) {
    if (
      /\d/.test(s) ||
      /\b(is|are|was|were|has|have|causes|cures|kills|proves)\b/i.test(s)
    ) {
      claimsSet.add(s);
    }
    if (claimsSet.size >= 8) break;
  }
  const claims = [...claimsSet];

  const unverifiableClaims = claims
    .filter(
      (c) =>
        /\b(studies show|experts say|scientists confirm|everyone knows|it is well known)\b/i.test(
          c,
        ) && !/https?:\/\//i.test(c),
    )
    .slice(0, 5)
    .map((claim) => ({
      claim,
      reason: "References an authority without naming a source.",
    }));

  // Crude credibility estimate: start at 70 and dock points for risky phrases.
  let credibility = 70;
  for (const rp of riskyPhrases) {
    credibility -= rp.severity === "high" ? 15 : rp.severity === "medium" ? 8 : 3;
  }
  credibility -= unverifiableClaims.length * 4;
  // Very short input is unreliable to judge either way.
  if (text.length < 80) credibility = Math.min(credibility, 60);
  credibility = Math.max(0, Math.min(100, Math.round(credibility)));

  const rationale =
    riskyPhrases.length === 0 && unverifiableClaims.length === 0
      ? "No obvious risky phrasing or unsourced authority appeals were detected by the offline heuristic. This is a shallow check — it does not evaluate factual accuracy."
      : `Offline heuristic found ${riskyPhrases.length} risky phrase(s) and ${unverifiableClaims.length} unverifiable claim(s). Lowered confidence accordingly. This is NOT a truth judgment; it only flags patterns that correlate with low-quality content.`;

  // Simulate a tiny bit of latency so the UI loading state is observable.
  if (process.env.MOCK_AI_DELAY_MS) {
    const ms = Number(process.env.MOCK_AI_DELAY_MS) || 0;
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }

  return {
    claims,
    riskyPhrases,
    unverifiableClaims,
    credibility,
    rationale,
  };
}
