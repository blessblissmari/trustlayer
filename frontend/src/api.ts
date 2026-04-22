import type { AnalysisReport, ReportsResponse } from "./types";

// Base URL for the backend API. In dev, Vite proxies /api -> localhost:8787.
// In production (Cloudflare Pages), set VITE_API_BASE to your Yandex API
// Gateway URL, e.g. "https://d5d....apigw.yandexcloud.net".
const BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, "") ??
  "/api";

export type Lang = "ru" | "en";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const raw = await res.text();
  let data: unknown = null;
  if (raw.length > 0) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new ApiError(res.status, `Non-JSON response: ${raw.slice(0, 200)}`);
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed: ${res.status}`) || `Request failed: ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export function analyzeText(text: string, lang: Lang): Promise<AnalysisReport> {
  return request<AnalysisReport>("/analyze/text", {
    method: "POST",
    body: JSON.stringify({ text, lang }),
  });
}

export function analyzeUrl(url: string, lang: Lang): Promise<AnalysisReport> {
  return request<AnalysisReport>("/analyze/url", {
    method: "POST",
    body: JSON.stringify({ url, lang }),
  });
}

export function listReports(limit = 50): Promise<ReportsResponse> {
  return request<ReportsResponse>(`/reports?limit=${limit}`);
}
