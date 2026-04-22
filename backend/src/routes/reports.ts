import type { Config } from "../config.js";
import { getStorage } from "../storage/index.js";
import { jsonResponse } from "../http.js";
import type { RouteResponse } from "../router.js";

export async function listReports(
  query: Record<string, string>,
  config: Config,
): Promise<RouteResponse> {
  const limitRaw = Number(query.limit);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 200)
      : 50;

  const reports = await getStorage(config).list(limit);
  return jsonResponse(200, { reports, total: reports.length });
}
