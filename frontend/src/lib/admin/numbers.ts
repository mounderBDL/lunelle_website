/** A whole number (digits only) from a text field, or null when it is empty, negative, decimal or too big. */
export function parseWhole(value: string, max = 10_000_000): number | null {
  const text = value.trim();
  if (!/^\d{1,9}$/.test(text)) return null;
  const n = Number(text);
  return n <= max ? n : null;
}

/** The same rounding as the server: percent discounts round to the nearest dinar. */
export function discountedPrice(base: number, type: "PERCENT" | "FIXED", value: number): number {
  const discount = type === "PERCENT" ? Math.floor((base * value + 50) / 100) : value;
  return Math.max(0, base - discount);
}