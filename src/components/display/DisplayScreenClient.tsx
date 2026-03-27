"use client";

import { createClient } from "@/lib/supabase/client";
import type { AlertRow } from "@/lib/types/database";
import { useCallback, useEffect, useState } from "react";
import { AlertOverlay } from "./AlertOverlay";
import { MotivationalMessages } from "./MotivationalMessages";

async function fetchActiveAlert(): Promise<AlertRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return data as AlertRow | null;
}

export function DisplayScreenClient() {
  const [active, setActive] = useState<AlertRow | null>(null);

  const refresh = useCallback(async () => {
    const row = await fetchActiveAlert();
    setActive(row);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("alerts-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const dismiss = useCallback(async () => {
    if (!active) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("alerts")
      .update({ status: "dismissed" })
      .eq("id", active.id);
    if (error) {
      console.error(error);
      return;
    }
    setActive(null);
  }, [active]);

  return (
    <div className="relative min-h-screen bg-slate-950">
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 py-12">
        <MotivationalMessages />
      </div>
      {active && <AlertOverlay alert={active} onDismiss={dismiss} />}
    </div>
  );
}
