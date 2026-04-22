import { randomUUID } from "node:crypto";
import type { Config } from "../config.js";
import { getAiClient } from "../ai/index.js";
import { normalizeLang } from "../i18n.js";
import { combineReport } from "../scoring/combine.js";
import { applyRules } from "../scoring/rules.js";
import { getStorage } from "../storage/index.js";
import type { AnalyzeTextRequest, Lang } from "../types.js";
import { HttpError, jsonResponse } from "../http.js";
import type { RouteResponse } from "../router.js";

export async function analyzeText(
  body: unknown,
  config: Config,
): Promise<RouteResponse> {
  const parsed = parseBody(body);
  const truncated = parsed.text.slice(0, config.maxInputChars);
  const lang: Lang = parsed.lang ?? "ru";

  const ai = getAiClient(config);
  const [aiAnalysis, rules] = await Promise.all([
    ai.analyze(truncated, lang),
    Promise.resolve(applyRules(truncated, lang)),
  ]);

  const report = combineReport({
    id: randomUUID(),
    inputKind: "text",
    analyzedText: truncated,
    aiAnalysis,
    rules,
    aiMode: ai.mode,
    lang,
  });

  await getStorage(config).save(report);
  return jsonResponse(200, report);
}

function parseBody(body: unknown): AnalyzeTextRequest {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  const { text, lang } = body as Record<string, unknown>;
  if (typeof text !== "string") {
    throw new HttpError(400, "Field 'text' is required and must be a string.");
  }
  if (text.trim().length === 0) {
    throw new HttpError(400, "Field 'text' must not be empty.");
  }
  return { text, lang: normalizeLang(lang) };
}
