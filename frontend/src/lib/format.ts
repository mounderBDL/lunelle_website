import type { Localized } from "./api/types";

/** The text in the visitor's language, falling back to the other one if it is missing. */
export function localized(text: Localized | null | undefined, locale: string): string {
  if (!text) return "";
  const preferred = locale === "fr" ? text.fr : text.en;
  return preferred || text.en || text.fr || "";
}

export function formatMoney(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-DZ" : "en-US", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Only real image addresses are used; test values such as "string" are ignored. */
export function imageUrlOrNull(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/") ? url : null;
}