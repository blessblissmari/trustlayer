import type { Config } from "./config.js";
import { HttpError } from "./http.js";
import { supabaseAdmin } from "./supabase.js";

export interface QuotaState {
  allowed: boolean;
  used: number;
  maxPerDay: number;
}

/**
 * Atomically increment today's analysis counter for a user and return the
 * updated state. Delegates to the `consume_quota` Postgres function so the
 * check + increment happen in a single transaction (no race between two
 * concurrent analyses).
 *
 * Throws HttpError 429 if the user is over the daily cap.
 */
export async function consumeQuota(
  config: Config,
  userId: string,
): Promise<QuotaState> {
  const client = supabaseAdmin(config);
  const { data, error } = await client.rpc("consume_quota", {
    p_user_id: userId,
    p_limit: config.quota.freeDailyLimit,
  });
  if (error) {
    throw new HttpError(500, `Quota check failed: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new HttpError(500, "Quota check returned no data.");
  }
  const r = row as {
    allowed: boolean;
    used: number;
    max_per_day: number;
  };
  const state: QuotaState = {
    allowed: Boolean(r.allowed),
    used: Number(r.used) || 0,
    maxPerDay: Number(r.max_per_day) || config.quota.freeDailyLimit,
  };
  if (!state.allowed) {
    throw new HttpError(
      429,
      `Daily analysis limit reached (${state.used}/${state.maxPerDay}). Try again tomorrow or upgrade.`,
    );
  }
  return state;
}

export async function readQuota(
  config: Config,
  userId: string,
): Promise<QuotaState> {
  const client = supabaseAdmin(config);
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from("quotas")
    .select("used_count")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();
  if (error) {
    throw new HttpError(500, `Quota lookup failed: ${error.message}`);
  }
  return {
    allowed: (data?.used_count ?? 0) < config.quota.freeDailyLimit,
    used: data?.used_count ?? 0,
    maxPerDay: config.quota.freeDailyLimit,
  };
}
