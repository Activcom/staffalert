/** Current weekday (0 = Sunday … 6 = Saturday) in Europe/Paris. */
export function getParisWeekday(d = new Date()): number {
  const w = d.toLocaleDateString("en-US", {
    timeZone: "Europe/Paris",
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? 0;
}

/** "HH:MM" 24h in Europe/Paris */
export function getParisHM(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function parseDaysCsv(days: string): number[] {
  return days
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
}

/** Entrée utilisateur « 1,2,3,4,5 » → jours 0–6 uniques triés (pour envoi à Supabase). */
export function parseDaysInputToSortedUniqueArray(csv: string): number[] {
  return [...new Set(parseDaysCsv(csv))].sort((a, b) => a - b);
}

/** Affichage édition : valeur API (tableau ou ancien texte) → chaîne « 1,2,3 ». */
export function formatDaysFieldForInput(days: ScheduledMessageDays): string {
  if (Array.isArray(days)) return days.join(",");
  if (typeof days === "string") return days;
  return "";
}

export type ScheduledMessageDays = number[] | string;

/** Cron / lecture : accepte integer[] (PostgREST) ou texte CSV hérité. */
export function normalizeScheduledDaysToNumbers(days: ScheduledMessageDays | unknown): number[] {
  if (Array.isArray(days)) {
    return [...new Set(days.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort(
      (a, b) => a - b
    );
  }
  if (typeof days === "string") {
    return parseDaysCsv(days);
  }
  return [];
}
