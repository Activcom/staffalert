"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

export type ReloadPostgrestSchemaResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Signals PostgREST to reload (fixes “table not in schema cache” after new tables).
 * Requires SUPABASE_SERVICE_ROLE_KEY and SQL function reload_postgrest_schema().
 */
export async function reloadPostgrestSchema(): Promise<ReloadPostgrestSchemaResult> {
  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return {
      ok: false,
      message:
        "Variable d’environnement serveur SUPABASE_SERVICE_ROLE_KEY absente. Ajoutez la clé « service_role » (Supabase → Project Settings → API), ou exécutez SELECT pg_notify('pgrst', 'reload schema'); dans l’éditeur SQL.",
    };
  }

  const { error } = await supabase.rpc("reload_postgrest_schema");
  if (error) {
    return {
      ok: false,
      message: `${error.message} — Vérifiez que la fonction public.reload_postgrest_schema() est créée (voir supabase/migrations/002_reload_postgrest_schema.sql).`,
    };
  }

  return { ok: true };
}
