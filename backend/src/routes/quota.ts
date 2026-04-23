import type { Config } from "../config.js";
import { requireUser } from "../auth.js";
import { readQuota } from "../quota.js";
import { jsonResponse } from "../http.js";
import type { RouteResponse } from "../router.js";

export async function getQuota(
  headers: Record<string, string> | undefined,
  config: Config,
): Promise<RouteResponse> {
  const user = await requireUser(headers, config);
  const state = await readQuota(config, user.id);
  return jsonResponse(200, {
    used: state.used,
    maxPerDay: state.maxPerDay,
    remaining: Math.max(0, state.maxPerDay - state.used),
  });
}
