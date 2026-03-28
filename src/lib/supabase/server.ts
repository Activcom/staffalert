import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const serviceOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/**
 * Server-only Supabase client (API routes, Server Actions, Route Handlers).
 * Uses the service role key — bypasses RLS; never import in client code.
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set (required for server-side Supabase access)"
    );
  }
  return createClient(url, key, serviceOptions);
}
