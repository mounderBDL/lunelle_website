import { algiersDate } from "./format";

export const PERIODS = ["7", "30", "90", "month", "lastmonth", "custom"] as const;
export type PeriodKey = (typeof PERIODS)[number];
export type DateRange = { from: string; to: string }; // YYYY-MM-DD, Algeria's dates
export type Granularity = "day" | "week" | "month";

export const MAX_DAYS = 400; // same limit as the server
const DAY_MS = 86_400_000;

const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function isIsoDate(value: string | null | undefined): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = toMs(value);
  return !Number.isNaN(ms) && toIso(ms) === value;
}

export const addDays = (iso: string, days: number) => toIso(toMs(iso) + days * DAY_MS);
export const daysInRange = (range: DateRange) => Math.round((toMs(range.to) - toMs(range.from)) / DAY_MS) + 1;

export function presetRange(key: Exclude<PeriodKey, "custom">): DateRange {
  const today = algiersDate();
  switch (key) {
    case "7":
      return { from: addDays(today, -6), to: today };
    case "30":
      return { from: addDays(today, -29), to: today };
    case "90":
      return { from: addDays(today, -89), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "lastmonth": {
      const lastDay = addDays(`${today.slice(0, 8)}01`, -1);
      return { from: `${lastDay.slice(0, 8)}01`, to: lastDay };
    }
  }
}

export function resolveRange(period: PeriodKey, from: string | null, to: string | null): DateRange | null {
  if (period !== "custom") return presetRange(period);
  return isIsoDate(from) && isIsoDate(to) ? { from, to } : null;
}

export function rangeProblem(range: DateRange | null): "missing" | "order" | "tooLong" | null {
  if (range === null) return "missing";
  if (range.from > range.to) return "order";
  if (daysInRange(range) > MAX_DAYS) return "tooLong";
  return null;
}

// ───── grouping of the chart ─────

export const autoGranularity = (days: number): Granularity => (days <= 31 ? "day" : days <= 140 ? "week" : "month");
export const granularityAllowed = (g: Granularity, days: number) => g !== "day" || days <= 92;

// ───── dates for display (the values are plain dates, so everything is formatted in UTC) ─────

function fmt(iso: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

export const shortDay = (iso: string, locale: string) => fmt(iso, locale, { day: "numeric", month: "short" });
export const longDay = (iso: string, locale: string) =>
  fmt(iso, locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const monthShort = (iso: string, locale: string) => fmt(iso, locale, { month: "short", year: "2-digit" });
export const monthLong = (iso: string, locale: string) => fmt(iso, locale, { month: "long", year: "numeric" });

export function formatRange(from: string, to: string, locale: string): string {
  const end = fmt(to, locale, { day: "numeric", month: "short", year: "numeric" });
  if (from === to) return end;
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const start = fmt(from, locale, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
  return `${start} – ${end}`;
}