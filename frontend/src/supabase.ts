import { createClient } from "@supabase/supabase-js";

// Public (anon) Supabase client. Used for auth flows and reading rows the
// user owns via RLS. The service role key NEVER ships to the browser.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "trustlayer.auth",
      },
    })
  : null;
