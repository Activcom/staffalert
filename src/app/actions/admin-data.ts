"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { AlertType, ScheduledMessageRow } from "@/lib/types/database";

function catchConfig(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur serveur Supabase";
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
  days: number[];
  time: string;
  active: boolean;
}): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("scheduled_messages").insert({
      message: row.message.trim(),
      type: row.type,
      days: row.days,
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
    days: number[];
    time: string;
    active: boolean;
  }
): Promise<{ error: string | null }> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("scheduled_messages")
      .update({
        message: row.message.trim(),
        type: row.type,
        days: row.days,
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
