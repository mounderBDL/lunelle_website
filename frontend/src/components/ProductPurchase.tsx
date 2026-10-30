"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PublicProduct } from "@/lib/api/types";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import { flyToCart, prefersReducedMotion } from "@/lib/motion";
import { MAX_PER_ITEM, useCart } from "@/store/cart";
import { useCartUi } from "@/store/cartUi";
import QuantityStepper from "./QuantityStepper";

const subscribe = () => () => {};

export default function ProductPurchase({ product }: { product: PublicProduct }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const add = useCart((s) => s.add);
  const openCart = useCartUi((s) => s.openCart);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const stickyAddRef = useRef<HTMLButtonElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const firstChoice = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(firstChoice?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [flash, setFlash] = useState(false);

  const selected = product.variants.find((v) => v.id === selectedId) ?? firstChoice;
  const inCartRaw = useCart(
    (s) => s.lines.find((l) => l.type === "VARIANT" && l.id === selected?.id)?.quantity ?? 0,
  );

  // the phone bar appears whenever the main "Add to cart" button is out of sight
  useEffect(() => {
    const target = addRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), {
      rootMargin: "0px 0px -88px 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // the moon progress button sits above the bar while it is showing
  useEffect(() => {
    const root = document.documentElement;
    if (!stickyVisible || !window.matchMedia("(max-width: 767px)").matches) return;
    root.style.setProperty("--moon-offset", "5.75rem");
    return () => {
      root.style.removeProperty("--moon-offset");
    };
  }, [stickyVisible]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  if (!selected) {
    return null;
  }

  // the cart lives in the browser: count it only after the page has loaded there
  const inCart = mounted ? inCartRaw : 0;
  const cap = Math.min(selected.maxQuantity, MAX_PER_ITEM);
  const allowed = Math.max(0, cap - inCart); // how many more can be added
  const canBuy = selected.inStock && allowed > 0;
  const qty = Math.min(quantity, Math.max(allowed, 1));
  const stockLimited = selected.maxQuantity < MAX_PER_ITEM;
  const allInCart = selected.inStock && allowed === 0;

  const blockedMessage = stockLimited
    ? inCart > 0
      ? t("limitStockInCart", { count: selected.maxQuantity, inCart })
      : t("limitStock", { count: selected.maxQuantity })
    : t("limitMax", { count: MAX_PER_ITEM });

  const onSale = selected.finalPrice < selected.price;
  const name = localized(product.name, locale);

  function handleAdd(origin: HTMLElement | null) {
    if (!canBuy || !selected) return;
    add({ type: "VARIANT", id: selected.id, quantity: qty });
    setAdded(true);
    setNotice(null);
    setFlash(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 1800);
    const image = imageUrlOrNull(product.images[0]?.url);
    flyToCart(origin, image ? cloudinaryLoader({ src: image, width: 160 }) : null);
  }

  const viewCart = (
    <button type="button" onClick={openCart} className="underline">
      {t("viewCart")}
    </button>
  );

  return (
    <div ref={wrapRef}>
      <div className="flex items-baseline gap-3">
        {onSale && <span className="text-lg text-cocoa/50 line-through">{formatMoney(selected.price, locale)}</span>}
        <span className={`text-3xl ${onSale ? "text-rose-dark" : ""}`}>{formatMoney(selected.finalPrice, locale)}</span>
      </div>

      <div className="mt-8">
        <p id="size-label" className="text-xs uppercase tracking-wider text-cocoa/70">
          {t("size")}
        </p>
        <div role="radiogroup" aria-labelledby="size-label" className="mt-3 flex flex-wrap gap-3">
          {product.variants.map((variant) => {
            const active = variant.id === selected.id;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!variant.inStock}
                onClick={() => {
                  setSelectedId(variant.id);
                  setQuantity(1);
                  setAdded(false);
                  setNotice(null);
                }}
                className={`rounded-xl border px-5 py-3 text-left text-sm transition-colors ${
                  active ? "border-rose-dark bg-blush" : "border-rose/40 hover:border-rose-dark"
                } ${variant.inStock ? "" : "cursor-not-allowed opacity-50"}`}
              >
                <span className="block font-medium">{variant.label}</span>
                <span className="block text-xs text-cocoa/70">
                  {variant.inStock ? formatMoney(variant.finalPrice, locale) : t("outOfStock")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <QuantityStepper
          value={qty}
          max={Math.max(allowed, 1)}
          onChange={(q) => {
            setQuantity(q);
            setAdded(false);
            setNotice(null);
          }}
          onBlocked={() => setNotice(blockedMessage)}
          decreaseLabel={t("decrease")}
          increaseLabel={t("increase")}
          disabled={!canBuy}
        />
        <button
          ref={addRef}
          type="button"
          onClick={() => handleAdd(addRef.current)}
          disabled={!canBuy}
          className="min-w-56 flex-1 rounded-full bg-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/30 sm:flex-none"
        >
          {selected.inStock ? t("addToCart") : t("outOfStock")}
        </button>
      </div>

      <div aria-live="polite" className="mt-4 min-h-6 space-y-1 text-sm">
        {notice && <p className="text-amber-dark">{notice}</p>}
        {allInCart && !notice && (
          <p className="text-amber-dark">
            {stockLimited ? t("allInCart", { count: selected.maxQuantity }) : t("limitMax", { count: MAX_PER_ITEM })}{" "}
            {viewCart}
          </p>
        )}
        {added && (
          <p className="text-rose-dark">
            {t("added")} · {viewCart}
          </p>
        )}
      </div>

      {/* ── phones: the bar that keeps "Add to cart" within reach ── */}
      <div
        inert={!stickyVisible}
        aria-hidden={!stickyVisible}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-rose/20 bg-cream/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_-18px_rgba(154,85,96,0.5)] backdrop-blur transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
          stickyVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() =>
              wrapRef.current?.scrollIntoView({
                behavior: prefersReducedMotion() ? "auto" : "smooth",
                block: "center",
              })
            }
            aria-label={t("changeChoice")}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate font-display text-lg leading-tight">{name}</span>
            <span className="block truncate text-sm text-cocoa/70">
              {selected.label} · {formatMoney(selected.finalPrice, locale)}
              {qty > 1 ? ` × ${qty}` : ""}
            </span>
          </button>

          {allInCart ? (
            <button
              type="button"
              onClick={openCart}
              className="shrink-0 rounded-full border border-rose-dark px-6 py-3 text-sm font-medium text-rose-dark"
            >
              {t("viewCart")}
            </button>
          ) : (
            <button
              ref={stickyAddRef}
              type="button"
              onClick={() => handleAdd(stickyAddRef.current)}
              disabled={!canBuy}
              className="shrink-0 rounded-full bg-rose-dark px-6 py-3 text-sm font-medium tracking-wide text-white transition-colors disabled:cursor-not-allowed disabled:bg-cocoa/30"
            >
              {!selected.inStock ? t("outOfStock") : flash ? t("addedShort") : t("addToCart")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}