import type { Config } from "./config.js";
import { analyzeText } from "./routes/analyzeText.js";
import { analyzeUrl } from "./routes/analyzeUrl.js";
import { listReports } from "./routes/reports.js";
import { errorResponse, jsonResponse } from "./http.js";

export interface RouteRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
}

export interface RouteResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

// Normalize the incoming path so the router works regardless of whether the
// API Gateway strips a base prefix or not.
function normalizePath(path: string): string {
  const cleaned = path.split("?")[0].replace(/\/+$/, "") || "/";
  return cleaned;
}

export async function route(
  req: RouteRequest,
  config: Config,
): Promise<RouteResponse> {
  const method = req.method.toUpperCase();
  const path = normalizePath(req.path);

  try {
    if (method === "OPTIONS") {
      return {
        status: 204,
        headers: corsHeaders(config),
        body: "",
      };
    }

    if (method === "GET" && (path === "/" || path === "/health")) {
      return jsonResponse(
        200,
        { status: "ok", service: "trustlayer", aiMode: config.aiMode },
        corsHeaders(config),
      );
    }

    let res: RouteResponse | undefined;
    if (method === "POST" && path === "/analyze/text") {
      res = await analyzeText(req.body, config);
    } else if (method === "POST" && path === "/analyze/url") {
      res = await analyzeUrl(req.body, config);
    } else if (method === "GET" && path === "/reports") {
      res = await listReports(req.query, config);
    }

    if (!res) {
      res = jsonResponse(404, { error: `Not found: ${method} ${path}` });
    }

    return {
      ...res,
      headers: { ...res.headers, ...corsHeaders(config) },
    };
  } catch (err) {
    const res = errorResponse(err);
    return { ...res, headers: { ...res.headers, ...corsHeaders(config) } };
  }
}

export function corsHeaders(config: Config): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": config.corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
  };
}
