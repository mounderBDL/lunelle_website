"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MAX_PER_ITEM, useCart } from "@/store/cart";
import QuantityStepper from "./QuantityStepper";

export default function PackPurchase({ packId, inStock }: { packId: string; inStock: boolean }) {
  const t = useTranslations("product");
  const add = useCart((s) => s.add);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <QuantityStepper
          value={quantity}
          max={MAX_PER_ITEM}
          onChange={(q) => {
            setQuantity(q);
            setAdded(false);
          }}
          decreaseLabel={t("decrease")}
          increaseLabel={t("increase")}
          disabled={!inStock}
        />
        <button
          type="button"
          onClick={() => {
            if (!inStock) return;
            add({ type: "PACK", id: packId, quantity });
            setAdded(true);
          }}
          disabled={!inStock}
          className="min-w-56 flex-1 rounded-full bg-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/30 sm:flex-none"
        >
          {inStock ? t("addToCart") : t("outOfStock")}
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