"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { requestQuote } from "@/lib/api/client";
import type { QuoteDto } from "@/lib/api/types";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import { MAX_PER_ITEM, useCart } from "@/store/cart";
import ImagePlaceholder from "./ImagePlaceholder";
import QuantityStepper from "./QuantityStepper";

const subscribe = () => () => {};

type Loaded = { key: string; quote: QuoteDto | null; error: string | null };

function Skeleton() {
  return (
    <div className="mt-10 space-y-4" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-blush/60" />
      ))}
    </div>
  );
}

export default function CartView() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const replaceLines = useCart((s) => s.replaceLines);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);
  const key = `${attempt}:${JSON.stringify(lines)}`;

  useEffect(() => {
    if (!mounted || lines.length === 0) return;
    let cancelled = false;
    void (async () => {
      const result = await requestQuote(lines);
      if (cancelled) return;
      if (result.kind === "prune") {
        replaceLines(result.keep); // some items were deleted from the shop: drop them and re-check
        return;
      }
      setLoaded({
        key,
        quote: result.kind === "ok" ? result.quote : null,
        error: result.kind === "error" ? result.message || "error" : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, lines, key, replaceLines]);

  if (!mounted) {
    return <Skeleton />;
  }

  if (lines.length === 0) {
    return (
      <div className="mt-12 text-center">
        <p className="font-display text-2xl text-cocoa/70">{t("empty")}</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-rose-dark px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-cocoa"
        >
          {t("continue")}
        </Link>
      </div>
    );
  }

  const fresh = loaded?.key === key;

  if (fresh && loaded.error && !loaded.quote) {
    return (
      <div className="mt-12 text-center">
        <p className="text-cocoa/80">{t("loadError")}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="mt-6 rounded-full border border-rose-dark px-8 py-3 text-sm font-medium text-rose-dark hover:bg-blush"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const quote = loaded?.quote ?? null;
  // the quote may be one step behind the cart while a new one loads: show it, with the cart's own quantities
  const rows = (quote?.lines ?? []).flatMap((q) => {
    const stored = lines.find((l) => l.type === q.type && l.id === q.id);
    return stored ? [{ q, quantity: stored.quantity }] : [];
  });

  if (rows.length === 0) {
    return <Skeleton />;
  }

  const loading = !fresh;
  const subtotal = rows.reduce((sum, r) => sum + r.q.unitPrice * r.quantity, 0);
  const hasProblem = rows.some((r) => r.q.problem !== null);
  const canCheckout = !loading && !hasProblem;

  return (
    <div className="mt-10">
      <ul className={`space-y-4 transition-opacity ${loading ? "opacity-70" : ""}`}>
        {rows.map(({ q, quantity }) => {
          const name = localized(q.name, locale);
          const image = imageUrlOrNull(q.imageUrl);
          const discounted = q.originalUnitPrice > q.unitPrice;
          const rowId = `${q.type}-${q.id}`;
          const cap = Math.min(MAX_PER_ITEM, q.available);
          const unavailable = q.problem === "UNAVAILABLE";
          const soldOut = q.problem === "OUT_OF_STOCK" && q.available === 0;
          const tooMany = q.problem === "OUT_OF_STOCK" && q.available > 0;
          const blockedText =
            q.available < MAX_PER_ITEM
              ? t("limitStock", { count: q.available })
              : t("limitMax", { count: MAX_PER_ITEM });

          return (
            <li key={rowId} className="flex gap-4 rounded-2xl border border-rose/20 bg-white/50 p-4 sm:gap-6">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-blush/60">
                {image ? (
                  <Image src={image} alt={name} fill sizes="96px" className="object-cover" />
                ) : (
                  <ImagePlaceholder />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl leading-tight">{name}</h2>
                    <p className="mt-0.5 text-sm text-cocoa/70">
                      {q.type === "PACK" ? t("pack") : q.variantLabel}
                    </p>
                  </div>
                  <p className="shrink-0 text-right">
                    {discounted && (
                      <span className="block text-xs text-cocoa/50 line-through">
                        {formatMoney(q.originalUnitPrice * quantity, locale)}
                      </span>
                    )}
                    <span className="font-medium">{formatMoney(q.unitPrice * quantity, locale)}</span>
                  </p>
                </div>

                {unavailable && (
                  <p role="alert" className="text-sm text-rose-dark">
                    {t("unavailable")}
                  </p>
                )}
                {soldOut && (
                  <p role="alert" className="text-sm text-rose-dark">
                    {t("soldOut")}
                  </p>
                )}
                {tooMany && (
                  <p role="alert" className="text-sm text-rose-dark">
                    {t("notEnough", { count: q.available })}{" "}
                    <button
                      type="button"
                      onClick={() => setQuantity(q.type, q.id, q.available)}
                      className="font-medium underline"
                    >
                      {t("setTo", { count: q.available })}
                    </button>
                  </p>
                )}
                {notice?.id === rowId && (
                  <p role="status" className="text-sm text-amber-dark">
                    {notice.text}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {unavailable || soldOut ? (
                    <span />
                  ) : (
                    <QuantityStepper
                      value={quantity}
                      max={cap}
                      onChange={(value) => {
                        setNotice(null);
                        setQuantity(q.type, q.id, value);
                      }}
                      onBlocked={() => setNotice({ id: rowId, text: blockedText })}
                      decreaseLabel={t("decrease")}
                      increaseLabel={t("increase")}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => remove(q.type, q.id)}
                    className="text-sm text-cocoa/70 underline hover:text-rose-dark"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 border-t border-rose/20 pt-6">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl">{t("subtotal")}</span>
          <span className="text-2xl">{formatMoney(subtotal, locale)}</span>
        </div>
        <p className="mt-2 text-sm text-cocoa/60">{t("deliveryNote")}</p>

        {hasProblem && !loading && <p className="mt-4 text-sm text-rose-dark">{t("fixIssues")}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm text-cocoa/70 underline hover:text-rose-dark">
            {t("continue")}
          </Link>
          {canCheckout ? (
            <Link
              href="/checkout"
              className="rounded-full bg-rose-dark px-10 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa"
            >
              {t("checkout")}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="cursor-not-allowed rounded-full bg-cocoa/30 px-10 py-3 text-sm font-medium tracking-wide text-white"
            >
              {t("checkout")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}