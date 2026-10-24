const ZONE = "Africa/Algiers";
const DAY_MS = 86_400_000;

/** 0551234567 -> "0551 23 45 67" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

/** A date as YYYY-MM-DD in Algeria's time zone, offsetDays from today. */
export function algiersDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * DAY_MS));
}

export function hourInAlgiers(nowMs: number): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: ZONE }).format(new Date(nowMs)),
  );
}

/** "2 hours ago", "yesterday", or a date for older orders. */
export function timeAgo(iso: string, nowMs: number, locale: string): string {
  if (nowMs === 0) return "";
  const lang = locale === "fr" ? "fr" : "en";
  const diff = Math.round((new Date(iso).getTime() - nowMs) / 1000); // negative = in the past
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(diff / 86_400), "day");
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: ZONE }).format(new Date(iso));
}

/** Short date and time, e.g. "24 Oct, 14:05". */
export function formatStamp(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONE,
  }).format(date);
}

/** 320 minutes -> "5h 20m"; 4300 minutes -> "2d 23h" (French: "5 h 20 min", "2 j 23 h"). */
export function formatSpan(totalMinutes: number, locale: string): string {
  const fr = locale === "fr";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const d = fr ? " j" : "d";
  const h = fr ? " h" : "h";
  const m = fr ? " min" : "m";
  if (days > 0) return hours === 0 ? `${days}${d}` : `${days}${d} ${hours}${h}`;
  if (hours === 0) return `${minutes}${m}`;
  return minutes === 0 ? `${hours}${h}` : `${hours}${h} ${minutes}${m}`;
}

/**
 * The value of a datetime-local input ("2026-10-24T13:30") for an instant, in Algeria's time.
 * Algeria is UTC+1 all year (no daylight saving), so a fixed offset is exact.
 */
export function toAlgiersInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + 3_600_000).toISOString().slice(0, 16);
}

/** The reverse: a datetime-local value (Algeria's time) to an ISO instant, or null if empty/invalid. */
export function fromAlgiersInput(value: string): string | null {
  if (!value) return null;
  const ms = Date.parse(`${value}:00+01:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}