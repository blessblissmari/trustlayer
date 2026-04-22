import type { AnalysisReport } from "../types.js";
import type { Storage } from "./index.js";

export class MemoryStorage implements Storage {
  private readonly reports: AnalysisReport[] = [];

  async save(report: AnalysisReport): Promise<void> {
    this.reports.unshift(report);
    // Cap history so a long-running container doesn't leak memory.
    if (this.reports.length > 500) this.reports.length = 500;
  }

  async list(limit = 50): Promise<AnalysisReport[]> {
    return this.reports.slice(0, limit);
  }

  async get(id: string): Promise<AnalysisReport | undefined> {
    return this.reports.find((r) => r.id === id);
  }
}
