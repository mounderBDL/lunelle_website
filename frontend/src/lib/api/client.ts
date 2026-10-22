import type { CartLine } from "@/store/cart";
import type { QuoteDto } from "./types";

export type QuoteResult =
  | { kind: "ok"; quote: QuoteDto }
  | { kind: "prune"; keep: CartLine[] } // some cart lines no longer exist: keep only these
  | { kind: "error"; message: string };

async function postQuote(lines: CartLine[]) {
  const res = await fetch("/api/checkout/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: lines.map((l) => ({ type: l.type, id: l.id, quantity: l.quantity })),
      // the cart only needs the lines and the subtotal; delivery is chosen at checkout
      deliveryMethod: "HAND_TO_HAND",
    }),
  });
  const body = (await res.json().catch(() => null)) as { message?: string } | QuoteDto | null;
  return { ok: res.ok, status: res.status, body };
}

const isUnknownItem = (r: { status: number; body: unknown }) =>
  r.status === 400 && String((r.body as { message?: string } | null)?.message ?? "").includes("Unknown item");

/** Asks the server for prices and availability. Lines that no longer exist are detected and dropped. */
export async function requestQuote(lines: CartLine[]): Promise<QuoteResult> {
  try {
    const first = await postQuote(lines);
    if (first.ok) {
      return { kind: "ok", quote: first.body as QuoteDto };
    }
    if (isUnknownItem(first)) {
      const keep: CartLine[] = [];
      for (const line of lines) {
        if (!isUnknownItem(await postQuote([line]))) {
          keep.push(line);
        }
      }
      if (keep.length < lines.length) {
        return { kind: "prune", keep };
      }
    }
    return { kind: "error", message: (first.body as { message?: string } | null)?.message ?? "" };
  } catch {
    return { kind: "error", message: "" };
  }
}