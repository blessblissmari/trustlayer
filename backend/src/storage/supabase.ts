import type { Config } from "../config.js";
import { supabaseAdmin } from "../supabase.js";
import type { AnalysisReport, Lang } from "../types.js";

// Supabase-backed implementation of the Storage interface. All reads/writes
// are scoped to a `user_id`; we do NOT offer a mode that returns another
// user's reports.

interface ReportRow {
  id: string;
  user_id: string;
  created_at: string;
  input_kind: "text" | "url";
  source: string | null;
  analyzed_text: string;
  trust_score: number;
  risk_flags: unknown;
  suspicious_patterns: unknown;
  unverifiable_claims: unknown;
  explanation: string;
  ai_mode: string;
  disclaimer: string;
  lang: Lang;
}

function rowToReport(row: ReportRow): AnalysisReport {
  return {
    id: row.id,
    createdAt: row.created_at,
    inputKind: row.input_kind,
    source: row.source ?? undefined,
    analyzedText: row.analyzed_text,
    trustScore: row.trust_score,
    riskFlags: (row.risk_flags ?? []) as AnalysisReport["riskFlags"],
    suspiciousPatterns: (row.suspicious_patterns ?? []) as AnalysisReport["suspiciousPatterns"],
    unverifiableClaims: (row.unverifiable_claims ?? []) as AnalysisReport["unverifiableClaims"],
    explanation: row.explanation,
    aiMode: row.ai_mode,
    disclaimer: row.disclaimer,
    lang: row.lang,
  };
}

// SupabaseStorage is used via SupabaseStorageAdapter (in storage/index.ts)
// so we don't need to implement the general `Storage` interface directly.
// All methods require a user_id.
export class SupabaseStorage {
  constructor(private readonly config: Config) {}

  async saveForUser(
    report: AnalysisReport,
    userId: string,
  ): Promise<void> {
    const client = supabaseAdmin(this.config);
    const { error } = await client.from("reports").insert({
      id: report.id,
      user_id: userId,
      created_at: report.createdAt,
      input_kind: report.inputKind,
      source: report.source ?? null,
      analyzed_text: report.analyzedText,
      trust_score: report.trustScore,
      risk_flags: report.riskFlags,
      suspicious_patterns: report.suspiciousPatterns,
      unverifiable_claims: report.unverifiableClaims,
      explanation: report.explanation,
      ai_mode: report.aiMode,
      disclaimer: report.disclaimer,
      lang: report.lang,
    });
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  }

  async listForUser(
    userId: string,
    limit: number,
  ): Promise<AnalysisReport[]> {
    const client = supabaseAdmin(this.config);
    const { data, error } = await client
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return (data ?? []).map((row) => rowToReport(row as ReportRow));
  }

  async deleteForUser(userId: string, reportId: string): Promise<void> {
    const client = supabaseAdmin(this.config);
    const { error } = await client
      .from("reports")
      .delete()
      .eq("user_id", userId)
      .eq("id", reportId);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }
}
