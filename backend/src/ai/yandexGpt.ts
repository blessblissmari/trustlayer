import type { Config } from "../config.js";
import type { AiAnalysis, Lang, Severity } from "../types.js";

// Server-side YandexGPT client. The API key is read from config, NEVER
// exposed to the frontend. See:
// https://yandex.cloud/en/docs/foundation-models/quickstart/yandexgpt
//
// We ask the model for a strict JSON object and defensively parse it. If the
// model returns invalid JSON we fall back to a minimal analysis so the whole
// request doesn't fail.

const SYSTEM_PROMPT_BASE = `You are TrustLayer, a risk-analysis assistant.
You do NOT decide whether content is true or false. You assess RISK by
extracting concrete claims, flagging phrasing patterns associated with
low-quality or misleading content, and noting claims that cannot be
verified from the text itself.

Always respond with a single JSON object matching this TypeScript type,
and nothing else:

{
  "claims": string[],                 // up to 10 concrete factual claims, verbatim or lightly paraphrased
  "riskyPhrases": Array<{
    "phrase": string,                 // short excerpt from the text
    "reason": string,                 // why it is risky
    "severity": "low" | "medium" | "high"
  }>,
  "unverifiableClaims": Array<{
    "claim": string,
    "reason": string                  // e.g. "cites unnamed experts"
  }>,
  "credibility": number,              // 0-100, your estimate of content quality / sourcing (NOT truth)
  "rationale": string                 // 1-3 sentence plain-language explanation
}

Rules:
- Never assert a claim is true or false. Use words like "risk", "unsourced",
  "unverifiable", "pattern associated with".
- Prefer to flag rhetoric (appeals to unnamed authority, urgency, absolute
  certainty, conspiracy framing) over debating factual content.
- If the input is too short or empty, return an object with empty arrays,
  credibility=50, and rationale explaining why.
- Output JSON only. No prose, no markdown fences.
- All human-readable string fields (reason, rationale, claims) MUST be written in {{LANGUAGE_FULL}}.`;

function systemPromptFor(lang: Lang): string {
  const languageFull = lang === "ru" ? "Russian (русский язык)" : "English";
  return SYSTEM_PROMPT_BASE.replace("{{LANGUAGE_FULL}}", languageFull);
}

interface YandexCompletionResponse {
  result?: {
    alternatives?: Array<{
      message?: { role?: string; text?: string };
      status?: string;
    }>;
  };
}

export async function yandexAnalyze(
  text: string,
  config: Config,
  lang: Lang = "ru",
): Promise<AiAnalysis> {
  const body = {
    modelUri: config.yandex.model,
    completionOptions: {
      stream: false,
      temperature: 0.2,
      maxTokens: 1200,
      reasoningOptions: { mode: "DISABLED" },
    },
    messages: [
      { role: "system", text: systemPromptFor(lang) },
      { role: "user", text },
    ],
  };

  const res = await fetch(config.yandex.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Api-Key ${config.yandex.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `YandexGPT request failed: ${res.status} ${res.statusText} ${detail.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as YandexCompletionResponse;
  const raw = data.result?.alternatives?.[0]?.message?.text ?? "";
  return parseAiJson(raw);
}

function parseAiJson(raw: string): AiAnalysis {
  const trimmed = raw.trim();
  // Strip accidental code fences.
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(withoutFence);
  } catch {
    // Try to extract the first {...} block.
    const match = withoutFence.match(/\{[\s\S]*\}/);
    if (!match) return safeFallback(raw);
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return safeFallback(raw);
    }
  }

  if (typeof parsed !== "object" || parsed === null) return safeFallback(raw);
  const obj = parsed as Record<string, unknown>;

  const claims = asStringArray(obj.claims).slice(0, 10);
  const riskyPhrases = asArray(obj.riskyPhrases)
    .map((item) => {
      const o = item as Record<string, unknown>;
      const phrase = typeof o.phrase === "string" ? o.phrase : "";
      const reason = typeof o.reason === "string" ? o.reason : "";
      const severity = normalizeSeverity(o.severity);
      if (!phrase) return null;
      return { phrase, reason, severity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 20);

  const unverifiableClaims = asArray(obj.unverifiableClaims)
    .map((item) => {
      const o = item as Record<string, unknown>;
      const claim = typeof o.claim === "string" ? o.claim : "";
      const reason = typeof o.reason === "string" ? o.reason : "";
      if (!claim) return null;
      return { claim, reason };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 10);

  let credibility = 50;
  if (typeof obj.credibility === "number" && Number.isFinite(obj.credibility)) {
    credibility = Math.max(0, Math.min(100, Math.round(obj.credibility)));
  }

  const rationale =
    typeof obj.rationale === "string" && obj.rationale.trim().length > 0
      ? obj.rationale.trim()
      : "YandexGPT returned no rationale.";

  return { claims, riskyPhrases, unverifiableClaims, credibility, rationale };
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStringArray(v: unknown): string[] {
  return asArray(v).filter((x): x is string => typeof x === "string");
}

function normalizeSeverity(v: unknown): Severity {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

function safeFallback(raw: string): AiAnalysis {
  return {
    claims: [],
    riskyPhrases: [],
    unverifiableClaims: [],
    credibility: 50,
    rationale:
      `YandexGPT response could not be parsed as JSON. Raw head: ${raw.slice(0, 160)}`.trim(),
  };
}

// Explicitly mark Severity as used in inference so tsc doesn't complain if
// we later prune the import — kept here as a reminder of the AiAnalysis shape.
export type { Severity };
