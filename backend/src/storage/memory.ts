import type { AnalysisReport } from "../types.js";
import type { Storage } from "./index.js";

// In-memory storage for tests and local dev. user_id scoping is ignored —
// this implementation is never used for multi-tenant production traffic.
export class MemoryStorage implements Storage {
  private readonly reports: AnalysisReport[] = [];

  async save(report: AnalysisReport, _userId?: string): Promise<void> {
    this.reports.unshift(report);
    if (this.reports.length > 500) this.reports.length = 500;
  }

  async list(limit = 50, _userId?: string): Promise<AnalysisReport[]> {
    return this.reports.slice(0, limit);
  }

  async get(
    id: string,
    _userId?: string,
  ): Promise<AnalysisReport | undefined> {
    return this.reports.find((r) => r.id === id);
  }
}
