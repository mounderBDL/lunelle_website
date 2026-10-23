import type { CartLine } from "@/store/cart";
import type { Commune, DeliveryMethod, OrderSummary, QuoteDto } from "./types";

const JSON_HEADERS = { "Content-Type": "application/json" };

type ErrorBody = { message?: string } | null;

async function readJson<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null;
}

// ───────────── quote (cart and checkout) ─────────────

export type QuoteResult =
  | { kind: "ok"; quote: QuoteDto }
  | { kind: "prune"; keep: CartLine[] } // some cart lines no longer exist: keep only these
  | { kind: "error"; message: string };

type QuoteOptions = { deliveryMethod?: DeliveryMethod; wilayaId?: number | null };

async function postQuote(lines: CartLine[], options: QuoteOptions) {
  const res = await fetch("/api/checkout/quote", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      items: lines.map((l) => ({ type: l.type, id: l.id, quantity: l.quantity })),
      deliveryMethod: options.deliveryMethod ?? "HAND_TO_HAND",
      ...(options.wilayaId != null ? { wilayaId: options.wilayaId } : {}),
    }),
  });
  const body = await readJson<QuoteDto | { message?: string }>(res);
  return { ok: res.ok, status: res.status, body };
}

const isUnknownItem = (r: { status: number; body: unknown }) =>
  r.status === 400 && String((r.body as ErrorBody)?.message ?? "").includes("Unknown item");

/** Asks the server for prices and availability. Lines that no longer exist are detected and dropped. */
export async function requestQuote(lines: CartLine[], options: QuoteOptions = {}): Promise<QuoteResult> {
  try {
    const first = await postQuote(lines, options);
    if (first.ok) {
      return { kind: "ok", quote: first.body as QuoteDto };
    }
    if (isUnknownItem(first)) {
      const keep: CartLine[] = [];
      for (const line of lines) {
        if (!isUnknownItem(await postQuote([line], {}))) {
          keep.push(line);
        }
      }
      if (keep.length < lines.length) {
        return { kind: "prune", keep };
      }
    }
    return { kind: "error", message: (first.body as ErrorBody)?.message ?? "" };
  } catch {
    return { kind: "error", message: "" };
  }
}

// ───────────── communes ─────────────

/** officeOnly = only communes with a Yalidine office. Returns null if the request failed. */
export async function fetchCommunes(wilayaId: number, officeOnly: boolean): Promise<Commune[] | null> {
  try {
    const res = await fetch(`/api/delivery/wilayas/${wilayaId}/communes${officeOnly ? "?officeOnly=true" : ""}`);
    return res.ok ? ((await res.json()) as Commune[]) : null;
  } catch {
    return null;
  }
}

// ───────────── placing an order ─────────────

export type PlaceOrderPayload = {
  customerName: string;
  phone: string;
  locale: "en" | "fr";
  deliveryMethod: DeliveryMethod;
  wilayaId: number | null;
  communeId: number | null;
  address: string | null;
  note: string | null;
  items: { type: "VARIANT" | "PACK"; id: string; quantity: number }[];
  website: string; // honeypot, always empty for real visitors
};

export type PlaceResult =
  | { kind: "created"; token: string }
  | { kind: "stock"; message: string }
  | { kind: "limit" }
  | { kind: "invalid"; message: string }
  | { kind: "error" };

export async function placeOrder(payload: PlaceOrderPayload): Promise<PlaceResult> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const body = await readJson<{ publicToken?: string }>(res);
      return body?.publicToken ? { kind: "created", token: body.publicToken } : { kind: "error" };
    }
    const message = (await readJson<{ message?: string }>(res))?.message ?? "";
    if (res.status === 409) return { kind: "stock", message };
    if (res.status === 429) return { kind: "limit" };
    if (res.status === 400) return { kind: "invalid", message };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

// ───────────── order lookup ─────────────

export type LookupResult =
  | { kind: "found"; order: OrderSummary }
  | { kind: "not-found" }
  | { kind: "limit" }
  | { kind: "error" };

export async function lookupOrder(code: string, phone: string): Promise<LookupResult> {
  try {
    const res = await fetch("/api/orders/lookup", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ code, phone }),
    });
    if (res.ok) {
      return { kind: "found", order: (await res.json()) as OrderSummary };
    }
    if (res.status === 404) return { kind: "not-found" };
    if (res.status === 429) return { kind: "limit" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}