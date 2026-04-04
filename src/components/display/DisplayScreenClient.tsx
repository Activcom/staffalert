"use client";

import { createClient } from "@/lib/supabase/client";
import type { AlertRow } from "@/lib/types/database";
import { useCallback, useEffect, useState } from "react";
import { AlertOverlay } from "./AlertOverlay";
import { MotivationalMessages } from "./MotivationalMessages";

const LOG = "[staffalert-display]";

async function fetchActiveAlert(): Promise<AlertRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error(LOG, "select alerts:", error.message);
    return null;
  }
  const row = data?.[0];
  return row ? (row as AlertRow) : null;
}

export function DisplayScreenClient() {
  const [active, setActive] = useState<AlertRow | null>(null);

  const refresh = useCallback(async () => {
    const row = await fetchActiveAlert();
    setActive(row);
  }, []);

  useEffect(() => {
    console.info(LOG, "composant monté, chargement initial + abonnement Realtime");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Sans ceci, si Realtime est HS ou la page était ouverte avant l’alerte, rien ne se met à jour. */
  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    /**
     * Topic unique par effet : `channel(name)` réutilise un canal existant ; si l’ancien n’est
     * pas encore `closed`, `subscribe()` n’enregistre pas le join → pas de Realtime (Strict Mode).
     */
    const topic = `alerts-${
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }`;
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => {
          void refresh();
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.info(LOG, "Realtime OK:", topic);
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(LOG, "Realtime:", status, err?.message ?? "");
        }
      });

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
      console.error(LOG, "dismiss:", error.message);
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
