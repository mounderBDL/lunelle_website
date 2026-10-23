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

/** 320 minutes -> "5h 20m" (English) or "5 h 20 min" (French). */
export function formatSpan(totalMinutes: number, locale: string): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = locale === "fr" ? " h" : "h";
  const m = locale === "fr" ? " min" : "m";
  if (hours === 0) return `${minutes}${m}`;
  return minutes === 0 ? `${hours}${h}` : `${hours}${h} ${minutes}${m}`;
}