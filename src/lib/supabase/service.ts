import { createClient } from "@supabase/supabase-js";

/** Server-only client for cron / trusted API routes (uses anon key; RLS must allow inserts/updates). */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env");
  }
  return createClient(url, key);
}
