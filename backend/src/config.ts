// Centralized runtime configuration. Reads from process.env so the same code
// works in Yandex Cloud Functions (where env vars are configured on the
// function) and in local dev via a .env file loaded by the local server.

export interface Config {
  aiMode: "yandex" | "mock";
  yandex: {
    apiKey: string;
    model: string;
    endpoint: string;
  };
  storage: {
    backend: "memory" | "file";
    filePath: string;
  };
  maxInputChars: number;
  maxUrlBytes: number;
  corsOrigin: string;
}

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function loadConfig(): Config {
  const aiMode = (str("AI_MODE", "mock") as Config["aiMode"]);
  return {
    aiMode: aiMode === "yandex" ? "yandex" : "mock",
    yandex: {
      apiKey: str("YANDEX_API_KEY"),
      model: str("YANDEX_GPT_MODEL"),
      endpoint: str(
        "YANDEX_GPT_ENDPOINT",
        "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
      ),
    },
    storage: {
      backend: (str("STORAGE_BACKEND", "memory") === "file"
        ? "file"
        : "memory"),
      filePath: str("STORAGE_FILE_PATH", "./data/reports.json"),
    },
    maxInputChars: num("MAX_INPUT_CHARS", 20000),
    maxUrlBytes: num("MAX_URL_BYTES", 2_000_000),
    corsOrigin: str("CORS_ORIGIN", "*"),
  };
}
