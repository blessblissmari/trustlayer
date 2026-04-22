import { randomUUID } from "node:crypto";
import type { Config } from "../config.js";
import { getAiClient } from "../ai/index.js";
import { combineReport } from "../scoring/combine.js";
import { applyRules } from "../scoring/rules.js";
import { getStorage } from "../storage/index.js";
import { fetchUrlAsText, UrlFetchError } from "../urlFetch.js";
import type { AnalyzeUrlRequest } from "../types.js";
import { HttpError, jsonResponse } from "../http.js";
import type { RouteResponse } from "../router.js";

export async function analyzeUrl(
  body: unknown,
  config: Config,
): Promise<RouteResponse> {
  const parsed = parseBody(body);

  let fetched;
  try {
    fetched = await fetchUrlAsText(parsed.url, config.maxUrlBytes);
  } catch (err) {
    if (err instanceof UrlFetchError) {
      throw new HttpError(err.status, err.message);
    }
    throw err;
  }

  const truncated = fetched.text.slice(0, config.maxInputChars);
  if (truncated.trim().length === 0) {
    throw new HttpError(
      422,
      "Fetched URL contained no readable text after stripping markup.",
    );
  }

  const ai = getAiClient(config);
  const [aiAnalysis, rules] = await Promise.all([
    ai.analyze(truncated),
    Promise.resolve(applyRules(truncated)),
  ]);

  const report = combineReport({
    id: randomUUID(),
    inputKind: "url",
    source: fetched.finalUrl,
    analyzedText: truncated,
    aiAnalysis,
    rules,
    aiMode: ai.mode,
  });

  await getStorage(config).save(report);
  return jsonResponse(200, report);
}

function parseBody(body: unknown): AnalyzeUrlRequest {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  const { url } = body as Record<string, unknown>;
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new HttpError(400, "Field 'url' is required and must be a string.");
  }
  return { url: url.trim() };
}
