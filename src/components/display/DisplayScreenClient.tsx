"use client";

import { createClient } from "@/lib/supabase/client";
import type { AlertRow } from "@/lib/types/database";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertOverlay } from "./AlertOverlay";
import { MotivationalMessages } from "./MotivationalMessages";

async function fetchActiveAlerts(): Promise<AlertRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }
  return (data ?? []) as AlertRow[];
}

export function DisplayScreenClient() {
  const [queue, setQueue] = useState<AlertRow[]>([]);
  const queueRef = useRef<AlertRow[]>([]);
  queueRef.current = queue;

  const refresh = useCallback(async () => {
    const rows = await fetchActiveAlerts();
    setQueue(rows);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Secours si Realtime (WebSocket) est bloqué ou instable (réseau, onglet en veille, etc.). */
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void refresh();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const dismiss = useCallback(async () => {
    const first = queueRef.current[0];
    if (!first) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("alerts")
      .update({ status: "dismissed" })
      .eq("id", first.id)
      .select("id,status");

    if (error) {
      return;
    }
    const updated = data?.[0];
    if (!updated || updated.status !== "dismissed") {
      return;
    }
    setQueue((prev) => (prev[0]?.id === first.id ? prev.slice(1) : prev));
  }, []);

  const current = queue[0];

  return (
    <div className="relative min-h-screen bg-slate-950">
      <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center gap-8 py-12">
        <MotivationalMessages />
      </div>
      {current && (
        <AlertOverlay
          alert={current}
          pendingCount={queue.length - 1}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
