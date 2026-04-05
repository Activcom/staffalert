"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { AlertType, ScheduledMessageRow } from "@/lib/types/database";
import { parseDaysInputToSortedUniqueArray } from "@/lib/time/paris";

function catchConfig(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur serveur Supabase";
}

function daysFromFormCsv(csv: string): { days: number[] } | { error: string } {
  const days = parseDaysInputToSortedUniqueArray(csv);
  if (days.length === 0) {
    return {
      error: "Jours invalides : indiquez des entiers de 0 à 6 séparés par des virgules (ex. 1,2,3,4,5).",
    };
  }
  return { days };
}

export async function listScheduledMessages(): Promise<{
  rows: ScheduledMessageRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .order("time", { ascending: true });
    if (error) return { rows: null, error: error.message };
    return { rows: (data ?? []) as ScheduledMessageRow[], error: null };
  } catch (e) {
    return { rows: null, error: catchConfig(e) };
  }
}

export async function listRecentAlerts(): Promise<{
  rows: { id: string; message: string }[] | null;
  error: string | null;
}> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("alerts")
      .select("id, message")
      .order("created_at", { ascending: false })
      .eq("type", "urgent")
      .limit(4);
    if (error) return { rows: null, error: error.message };
    const rows = (data ?? []).map((r) => ({
      id: String(r.id),
      message: String(r.message ?? ""),
    }));
    return { rows, error: null };
  } catch (e) {
    return { rows: null, error: catchConfig(e) };
  }
}

export async function deleteAlert(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("alerts").delete().eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: catchConfig(e) };
  }
}

export async function insertAlert(
  message: string,
  type: AlertType
): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("alerts").insert({
      message: message.trim(),
      type,
      status: "active",
    });
    if (error) {
      return { error: error.message };
    }
    try {
      const { data: keepRows } = await supabase
        .from("alerts")
        .select("id")
        .eq("type", "urgent")
        .order("created_at", { ascending: false })
        .limit(4);
      const ids = (keepRows ?? []).map((r) => String(r.id));
      if (ids.length > 0) {
        await supabase
          .from("alerts")
          .delete()
          .eq("type", "urgent")
          .not("id", "in", "(" + ids.join(",") + ")");
      }
    } catch {}
    return { error: null };
  } catch (e) {
    return { error: catchConfig(e) };
  }
}

export async function insertScheduledMessage(row: {
  message: string;
  type: AlertType;
  days: string;
  time: string;
  active: boolean;
}): Promise<{ error: string | null }> {
  try {
    const parsed = daysFromFormCsv(row.days);
    if ("error" in parsed) return { error: parsed.error };
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("scheduled_messages").insert({
      message: row.message.trim(),
      type: row.type,
      days: parsed.days,
      time: row.time,
      active: row.active,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: catchConfig(e) };
  }
}

export async function updateScheduledMessage(
  id: string,
  row: {
    message: string;
    type: AlertType;
    days: string;
    time: string;
    active: boolean;
  }
): Promise<{ error: string | null }> {
  try {
    const parsed = daysFromFormCsv(row.days);
    if ("error" in parsed) return { error: parsed.error };
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("scheduled_messages")
      .update({
        message: row.message.trim(),
        type: row.type,
        days: parsed.days,
        time: row.time,
        active: row.active,
      })
      .eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: catchConfig(e) };
  }
}

export async function setScheduledActive(
  id: string,
  active: boolean
): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("scheduled_messages").update({ active }).eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: catchConfig(e) };
  }
}

export async function deleteScheduledMessage(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("scheduled_messages").delete().eq("id", id);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: catchConfig(e) };
  }
}
