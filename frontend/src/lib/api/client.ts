import type { CartLine } from "@/store/cart";
import type { Commune, DeliveryMethod, OrderSummary, QuoteDto, Office } from "./types";

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

/** The Yalidine offices of a commune. Returns null if the request failed. */
export async function fetchOffices(communeId: number): Promise<Office[] | null> {
  try {
    const res = await fetch(`/api/delivery/communes/${communeId}/offices`);
    return res.ok ? ((await res.json()) as Office[]) : null;
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
  officeId: number | null;
  note: string | null;
  items: { type: "VARIANT" | "PACK"; id: string; quantity: number }[];
  website: string; // honeypot, always empty for real visitors
};

export type PlaceResult =
  | { kind: "created"; token: string }
  | { kind: "stock"; message: string; code?: string; params?: Record<string, string> }
  | { kind: "limit" }
  | { kind: "invalid"; message: string; code?: string; params?: Record<string, string> }
  | { kind: "error" };

const ATTEMPT_STORAGE = "lunelle_order_attempt";

function randomKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes); // works on plain http too, unlike crypto.randomUUID()
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * One random key per order attempt. If the answer is lost and the customer taps again with the same cart and details,
 * the same key goes out and the server hands back the first order instead of creating a second one.
 * Changing anything in the order gives a new key.
 */
function attemptKey(payload: PlaceOrderPayload): string {
  const fingerprint = JSON.stringify([
    payload.customerName,
    payload.phone,
    payload.locale,
    payload.deliveryMethod,
    payload.wilayaId,
    payload.communeId,
    payload.address,
    payload.note,
    payload.items,
  ]);
  try {
    const saved = JSON.parse(sessionStorage.getItem(ATTEMPT_STORAGE) ?? "null") as { key: string; fp: string } | null;
    if (saved && saved.fp === fingerprint && typeof saved.key === "string") return saved.key;
    const key = randomKey();
    sessionStorage.setItem(ATTEMPT_STORAGE, JSON.stringify({ key, fp: fingerprint }));
    return key;
  } catch {
    return randomKey(); // storage blocked: still protects against a double tap on the same page
  }
}

function forgetAttempt() {
  try {
    sessionStorage.removeItem(ATTEMPT_STORAGE);
  } catch {
    // nothing to forget
  }
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<PlaceResult> {
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ ...payload, idempotencyKey: attemptKey(payload) }),
    });
    if (res.ok) {
      forgetAttempt();
      const body = await readJson<{ publicToken?: string }>(res);
      return body?.publicToken ? { kind: "created", token: body.publicToken } : { kind: "error" };
    }
    const err = await readJson<{ message?: string; code?: string; params?: Record<string, string> }>(res);
    const message = err?.message ?? "";
    const extra = { code: err?.code, params: err?.params };
    if (res.status === 409) return { kind: "stock", message, ...extra };
    if (res.status === 429) return { kind: "limit" };
    if (res.status === 400) return { kind: "invalid", message, ...extra };
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