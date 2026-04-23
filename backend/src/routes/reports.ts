import type { Config } from "../config.js";
import { getUserFromAuthHeader } from "../auth.js";
import { getStorage } from "../storage/index.js";
import { HttpError, jsonResponse } from "../http.js";
import type { RouteResponse } from "../router.js";

export async function listReports(
  query: Record<string, string>,
  headers: Record<string, string> | undefined,
  config: Config,
): Promise<RouteResponse> {
  const limitRaw = Number(query.limit);
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 200)
      : 50;

  const user = await getUserFromAuthHeader(headers, config);
  if (config.storage.backend === "supabase" && !user) {
    throw new HttpError(401, "Sign in to view your history.");
  }

  const reports = await getStorage(config).list(limit, user?.id);
  return jsonResponse(200, { reports, total: reports.length });
}
