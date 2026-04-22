import type { AnalysisReport } from "../types.js";
import type { Config } from "../config.js";
import { MemoryStorage } from "./memory.js";
import { FileStorage } from "./file.js";

export interface Storage {
  save(report: AnalysisReport): Promise<void>;
  list(limit?: number): Promise<AnalysisReport[]>;
  get(id: string): Promise<AnalysisReport | undefined>;
}

// Module-level singleton so multiple invocations inside one warm function
// container share the same in-memory store.
let instance: Storage | undefined;

export function getStorage(config: Config): Storage {
  if (instance) return instance;
  instance =
    config.storage.backend === "file"
      ? new FileStorage(config.storage.filePath)
      : new MemoryStorage();
  return instance;
}

// Exposed for tests so we can reset between cases.
export function resetStorageForTests(): void {
  instance = undefined;
}
