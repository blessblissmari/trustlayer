import type { Config } from "../config.js";
import type { AiAnalysis, Lang } from "../types.js";
import { mockAnalyze } from "./mockAi.js";
import { yandexAnalyze } from "./yandexGpt.js";

export interface AiClient {
  analyze(text: string, lang: Lang): Promise<AiAnalysis>;
  readonly mode: "yandex" | "mock";
}

export function getAiClient(config: Config): AiClient {
  if (config.aiMode === "yandex") {
    if (!config.yandex.apiKey || !config.yandex.model) {
      // Missing credentials: fall back to mock so the function doesn't 500.
      // The response will still advertise mode=mock so the UI can show a banner.
      return {
        mode: "mock",
        analyze: (t, lang) => mockAnalyze(t, lang),
      };
    }
    return {
      mode: "yandex",
      analyze: (t, lang) => yandexAnalyze(t, config, lang),
    };
  }
  return { mode: "mock", analyze: (t, lang) => mockAnalyze(t, lang) };
}
