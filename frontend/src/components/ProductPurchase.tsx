"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { PublicProduct } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { MAX_PER_ITEM, useCart } from "@/store/cart";
import QuantityStepper from "./QuantityStepper";

export default function ProductPurchase({ product }: { product: PublicProduct }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const add = useCart((s) => s.add);

  const firstChoice = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(firstChoice?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = product.variants.find((v) => v.id === selectedId) ?? firstChoice;
  if (!selected) {
    return null;
  }

  const onSale = selected.finalPrice < selected.price;
  const canBuy = selected.inStock;

  function handleAdd() {
    if (!canBuy) return;
    add({ type: "VARIANT", id: selected.id, quantity });
    setAdded(true);
  }

  return (
    <div>
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
                  setAdded(false);
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

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <QuantityStepper
          value={quantity}
          max={MAX_PER_ITEM}
          onChange={(q) => {
            setQuantity(q);
            setAdded(false);
          }}
          decreaseLabel={t("decrease")}
          increaseLabel={t("increase")}
          disabled={!canBuy}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canBuy}
          className="min-w-56 flex-1 rounded-full bg-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/30 sm:flex-none"
        >
          {canBuy ? t("addToCart") : t("outOfStock")}
        </button>
      </div>

      <p aria-live="polite" className="mt-4 min-h-6 text-sm text-rose-dark">
        {added && (
          <>
            {t("added")} ·{" "}
            <Link href="/cart" className="underline">
              {t("viewCart")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}