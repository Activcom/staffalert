import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getParisHM, getParisWeekday, parseDaysCsv } from "@/lib/time/paris";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const hm = getParisHM(now);
  const weekday = getParisWeekday(now);

  const { data: rows, error } = await supabase
    .from("scheduled_messages")
    .select("id, message, type, days, time, active")
    .eq("active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const toFire = (rows ?? []).filter((row) => {
    if (row.time !== hm) return false;
    const allowed = parseDaysCsv(row.days);
    return allowed.includes(weekday);
  });

  const inserted: string[] = [];
  for (const row of toFire) {
    const { error: insErr } = await supabase.from("alerts").insert({
      message: row.message,
      type: row.type,
      status: "active",
    });
    if (!insErr) inserted.push(row.id);
  }

  return NextResponse.json({
    ok: true,
    parisTime: hm,
    parisWeekday: weekday,
    fired: inserted.length,
  });
}
