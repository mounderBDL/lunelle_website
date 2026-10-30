"use client";

import { ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import { useCartQuote } from "@/lib/useCartQuote";
import { MAX_PER_ITEM, useCart } from "@/store/cart";
import { useCartUi } from "@/store/cartUi";
import ImagePlaceholder from "./ImagePlaceholder";
import QuantityStepper from "./QuantityStepper";

export default function CartDrawer() {
  const ref = useRef<HTMLDialogElement>(null);
  const open = useCartUi((s) => s.open);
  const present = useCartUi((s) => s.present);

  // the native <dialog> traps the focus, closes on Escape and keeps the page behind inert
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      const frame = requestAnimationFrame(() => {
        dialog.dataset.state = "open";
      });
      return () => cancelAnimationFrame(frame);
    }

    if (dialog.open) {
      dialog.dataset.state = "closing";
      const timer = window.setTimeout(() => dialog.close(), prefersReducedMotion() ? 0 : 300);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  // the page behind does not scroll while the drawer is on screen
  useEffect(() => {
    if (!present) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous;
    };
  }, [present]);

  return (
    <dialog
      ref={ref}
      className="cart-drawer"
      aria-labelledby="cart-drawer-title"
      onCancel={(event) => {
        event.preventDefault(); // let the slide-out animation run
        useCartUi.getState().closeCart();
      }}
      onClose={() => useCartUi.getState().finish()}
      onClick={(event) => {
        if (event.target === event.currentTarget) useCartUi.getState().closeCart(); // the dimmed area
      }}
    >
      {present && <DrawerBody />}
    </dialog>
  );
}

function DrawerBody() {
  const t = useTranslations("cart");
  const td = useTranslations("drawer");
  const locale = useLocale();
  const { lines, quote, fresh, failed, retry } = useCartQuote(true);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const close = useCartUi((s) => s.closeCart);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);

  // the quote may be one step behind the cart while a new one loads: show it with the cart's own quantities
  const rows = (quote?.lines ?? []).flatMap((q) => {
    const stored = lines.find((l) => l.type === q.type && l.id === q.id);
    return stored ? [{ q, quantity: stored.quantity }] : [];
  });
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = rows.reduce((sum, r) => sum + r.q.unitPrice * r.quantity, 0);
  const hasProblem = rows.some((r) => r.q.problem !== null);
  const loading = lines.length > 0 && !fresh;
  const canCheckout = rows.length > 0 && !loading && !hasProblem;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
        <div>
          <h2 id="cart-drawer-title" className="text-3xl">
            {td("title")}
          </h2>
          {itemCount > 0 && <p className="mt-1 text-sm text-cocoa/60">{td("items", { count: itemCount })}</p>}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={td("close")}
          className="rounded-full p-2 text-cocoa/70 transition-colors hover:bg-blush"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center pb-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blush text-rose-dark">
              <ShoppingBag className="h-7 w-7" aria-hidden />
            </span>
            <p className="mt-5 font-display text-2xl text-cocoa/75">{t("empty")}</p>
            <button
              type="button"
              onClick={close}
              className="mt-6 rounded-full bg-rose-dark px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-cocoa"
            >
              {t("continue")}
            </button>
          </div>
        ) : failed ? (
          <div className="pt-8 text-center">
            <p className="text-cocoa/80">{t("loadError")}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 rounded-full border border-rose-dark px-8 py-3 text-sm font-medium text-rose-dark hover:bg-blush"
            >
              {t("retry")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="space-y-3 pt-2" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-blush/70" />
            ))}
          </div>
        ) : (
          <ul className={`space-y-3 transition-opacity ${loading ? "opacity-70" : ""}`}>
            {rows.map(({ q, quantity }) => {
              const name = localized(q.name, locale);
              const image = imageUrlOrNull(q.imageUrl);
              const rowId = `${q.type}-${q.id}`;
              const discounted = q.originalUnitPrice > q.unitPrice;
              const cap = Math.min(MAX_PER_ITEM, q.available);
              const unavailable = q.problem === "UNAVAILABLE";
              const soldOut = q.problem === "OUT_OF_STOCK" && q.available === 0;
              const tooMany = q.problem === "OUT_OF_STOCK" && q.available > 0;
              const blockedText =
                q.available < MAX_PER_ITEM
                  ? t("limitStock", { count: q.available })
                  : t("limitMax", { count: MAX_PER_ITEM });

              return (
                <li key={rowId} className="flex gap-4 rounded-2xl border border-rose/20 bg-white/70 p-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-blush/60">
                    {image ? (
                      <Image src={image} alt={name} fill sizes="80px" className="object-cover" />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-lg leading-tight">{name}</p>
                        <p className="text-sm text-cocoa/65">{q.type === "PACK" ? t("pack") : q.variantLabel}</p>
                      </div>
                      <p className="shrink-0 text-right text-sm">
                        {discounted && (
                          <span className="block text-xs text-cocoa/45 line-through">
                            {formatMoney(q.originalUnitPrice * quantity, locale)}
                          </span>
                        )}
                        <span className="font-medium tabular-nums">{formatMoney(q.unitPrice * quantity, locale)}</span>
                      </p>
                    </div>

                    {unavailable && (
                      <p role="alert" className="text-xs text-rose-dark">
                        {t("unavailable")}
                      </p>
                    )}
                    {soldOut && (
                      <p role="alert" className="text-xs text-rose-dark">
                        {t("soldOut")}
                      </p>
                    )}
                    {tooMany && (
                      <p role="alert" className="text-xs text-rose-dark">
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
                      <p role="status" className="text-xs text-amber-dark">
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
                        className="text-xs text-cocoa/65 underline hover:text-rose-dark"
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rows.length > 0 && (
        <footer className="border-t border-rose/20 bg-cream/90 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl">{t("subtotal")}</span>
            <span className="text-xl font-semibold tabular-nums">{formatMoney(subtotal, locale)}</span>
          </div>
          <p className="mt-1 text-xs text-cocoa/60">{t("deliveryNote")}</p>
          {hasProblem && !loading && <p className="mt-3 text-sm text-rose-dark">{t("fixIssues")}</p>}

          {canCheckout ? (
            <Link
              href="/checkout"
              onClick={close}
              className="mt-4 block rounded-full bg-rose-dark px-8 py-3.5 text-center text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa"
            >
              {t("checkout")}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="mt-4 block cursor-not-allowed rounded-full bg-cocoa/30 px-8 py-3.5 text-center text-sm font-medium tracking-wide text-white"
            >
              {t("checkout")}
            </span>
          )}
          <Link
            href="/cart"
            onClick={close}
            className="mt-3 block text-center text-sm text-cocoa/65 underline hover:text-rose-dark"
          >
            {td("viewFull")}
          </Link>
        </footer>
      )}
    </div>
  );
}