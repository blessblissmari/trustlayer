import type { Config } from "./config.js";
import { HttpError } from "./http.js";
import { hasSupabase, supabaseAdmin } from "./supabase.js";

export interface AuthUser {
  id: string;
  email: string | null;
}

export function extractBearer(
  headers: Record<string, string> | undefined,
): string | null {
  if (!headers) return null;
  // Header names come through API Gateway in various cases; match either.
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== "authorization") continue;
    if (typeof value !== "string") continue;
    const match = /^Bearer\s+(.+)$/i.exec(value.trim());
    if (match) return match[1]!.trim();
  }
  return null;
}

/**
 * Verify a Supabase-issued JWT by asking the GoTrue server who it belongs to.
 * This round-trip is authoritative: if the token has been revoked or the user
 * has been deleted, getUser() returns an error. We avoid shipping the JWT
 * signing secret to the function.
 *
 * Returns null for routes where auth is optional and no token was sent.
 * Throws 401 when a token is present but invalid.
 */
export async function getUserFromAuthHeader(
  headers: Record<string, string> | undefined,
  config: Config,
): Promise<AuthUser | null> {
  const token = extractBearer(headers);
  if (!token) return null;

  if (!hasSupabase(config)) {
    throw new HttpError(
      503,
      "Server is not configured for authentication (SUPABASE_URL missing).",
    );
  }

  const client = supabaseAdmin(config);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError(401, "Invalid or expired session token.");
  }
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function requireUser(
  headers: Record<string, string> | undefined,
  config: Config,
): Promise<AuthUser> {
  const user = await getUserFromAuthHeader(headers, config);
  if (!user) {
    throw new HttpError(401, "Authentication required.");
  }
  return user;
}
