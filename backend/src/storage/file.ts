import { promises as fs } from "node:fs";
import path from "node:path";
import type { AnalysisReport } from "../types.js";
import type { Storage } from "./index.js";

// Simple JSON-file storage for local dev. Not suitable for production
// (no locking, not multi-process safe). In the Yandex Cloud Function
// production deployment, replace with a storage adapter that talks to
// YDB or Yandex Object Storage.
export class FileStorage implements Storage {
  private writing: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<AnalysisReport[]> {
    try {
      const buf = await fs.readFile(this.filePath, "utf8");
      const data = JSON.parse(buf);
      return Array.isArray(data) ? (data as AnalysisReport[]) : [];
    } catch (err: unknown) {
      if (isEnoent(err)) return [];
      throw err;
    }
  }

  private async writeAll(reports: AnalysisReport[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(reports, null, 2), "utf8");
  }

  async save(report: AnalysisReport): Promise<void> {
    // Serialize writes so concurrent saves don't clobber each other.
    this.writing = this.writing.then(async () => {
      const all = await this.readAll();
      all.unshift(report);
      if (all.length > 500) all.length = 500;
      await this.writeAll(all);
    });
    await this.writing;
  }

  async list(limit = 50): Promise<AnalysisReport[]> {
    const all = await this.readAll();
    return all.slice(0, limit);
  }

  async get(id: string): Promise<AnalysisReport | undefined> {
    const all = await this.readAll();
    return all.find((r) => r.id === id);
  }
}

function isEnoent(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "ENOENT"
  );
}
