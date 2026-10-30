"use client";

import { useEffect, useState } from "react";
import { requestQuote } from "@/lib/api/client";
import type { QuoteDto } from "@/lib/api/types";
import { useCart } from "@/store/cart";

type Loaded = { key: string; quote: QuoteDto | null; failed: boolean };

/** Prices and availability of the cart, asked to the server (the same check as the cart page). */
export function useCartQuote(active: boolean) {
  const lines = useCart((s) => s.lines);
  const replaceLines = useCart((s) => s.replaceLines);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${attempt}:${JSON.stringify(lines)}`;

  useEffect(() => {
    if (!active || lines.length === 0) return;
    let cancelled = false;
    void (async () => {
      const result = await requestQuote(lines);
      if (cancelled) return;
      if (result.kind === "prune") {
        replaceLines(result.keep); // some items were removed from the shop: drop them and check again
        return;
      }
      setLoaded({ key, quote: result.kind === "ok" ? result.quote : null, failed: result.kind === "error" });
    })();
    return () => {
      cancelled = true;
    };
  }, [active, lines, key, replaceLines]);

  const fresh = loaded?.key === key;
  return {
    lines,
    quote: loaded?.quote ?? null,
    fresh,
    failed: fresh && loaded.failed && loaded.quote === null,
    retry: () => setAttempt((n) => n + 1),
  };
}