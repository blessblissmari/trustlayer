import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Config } from "./config.js";

// Supabase client factory. The service role key bypasses RLS and is used
// for server-side writes and RPC calls (e.g. consume_quota). It must NEVER
// leak to the browser.

let cachedAdmin: SupabaseClient | null = null;

export function supabaseAdmin(config: Config): SupabaseClient {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error(
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (cachedAdmin) return cachedAdmin;
  cachedAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

export function hasSupabase(config: Config): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}
