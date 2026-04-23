import type { AnalysisReport } from "../types.js";
import type { Config } from "../config.js";
import { MemoryStorage } from "./memory.js";
import { FileStorage } from "./file.js";
import { SupabaseStorage } from "./supabase.js";

export interface Storage {
  save(report: AnalysisReport, userId?: string): Promise<void>;
  list(limit?: number, userId?: string): Promise<AnalysisReport[]>;
  get(id: string, userId?: string): Promise<AnalysisReport | undefined>;
}

// Module-level singleton so multiple invocations inside one warm function
// container share the same store instance.
let instance: Storage | undefined;

export function getStorage(config: Config): Storage {
  if (instance) return instance;
  if (config.storage.backend === "supabase") {
    instance = new SupabaseStorageAdapter(new SupabaseStorage(config));
  } else if (config.storage.backend === "file") {
    instance = new FileStorage(config.storage.filePath);
  } else {
    instance = new MemoryStorage();
  }
  return instance;
}

// Exposed for tests so we can reset between cases.
export function resetStorageForTests(): void {
  instance = undefined;
}

// Thin adapter so callers see a uniform interface. Supabase always scopes
// by user_id; memory/file storage ignore it (they're only used in local dev
// and tests, never for the multi-tenant production path).
class SupabaseStorageAdapter implements Storage {
  constructor(private readonly backend: SupabaseStorage) {}

  async save(report: AnalysisReport, userId?: string): Promise<void> {
    if (!userId) {
      throw new Error("Supabase storage requires an authenticated user.");
    }
    await this.backend.saveForUser(report, userId);
  }

  async list(limit = 50, userId?: string): Promise<AnalysisReport[]> {
    if (!userId) return [];
    return this.backend.listForUser(userId, limit);
  }

  async get(
    id: string,
    userId?: string,
  ): Promise<AnalysisReport | undefined> {
    if (!userId) return undefined;
    const rows = await this.backend.listForUser(userId, 200);
    return rows.find((r) => r.id === id);
  }
}
