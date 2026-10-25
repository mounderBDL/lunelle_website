"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { MAX_PER_ITEM, useCart } from "@/store/cart";
import QuantityStepper from "./QuantityStepper";

const subscribe = () => () => {};

type Props = { packId: string; inStock: boolean; maxQuantity: number };

export default function PackPurchase({ packId, inStock, maxQuantity }: Props) {
  const t = useTranslations("product");
  const add = useCart((s) => s.add);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const inCartRaw = useCart((s) => s.lines.find((l) => l.type === "PACK" && l.id === packId)?.quantity ?? 0);

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const inCart = mounted ? inCartRaw : 0;
  const cap = Math.min(maxQuantity, MAX_PER_ITEM);
  const allowed = Math.max(0, cap - inCart);
  const canBuy = inStock && allowed > 0;
  const qty = Math.min(quantity, Math.max(allowed, 1));
  const stockLimited = maxQuantity < MAX_PER_ITEM;
  const allInCart = inStock && allowed === 0;

  const blockedMessage = stockLimited
    ? inCart > 0
      ? t("limitStockInCart", { count: maxQuantity, inCart })
      : t("limitStock", { count: maxQuantity })
    : t("limitMax", { count: MAX_PER_ITEM });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
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
          type="button"
          onClick={() => {
            if (!canBuy) return;
            add({ type: "PACK", id: packId, quantity: qty });
            setAdded(true);
            setNotice(null);
          }}
          disabled={!canBuy}
          className="min-w-56 flex-1 rounded-full bg-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/30 sm:flex-none"
        >
          {inStock ? t("addToCart") : t("outOfStock")}
        </button>
      </div>

      <div aria-live="polite" className="mt-4 min-h-6 space-y-1 text-sm">
        {notice && <p className="text-amber-dark">{notice}</p>}
        {allInCart && !notice && (
          <p className="text-amber-dark">
            {stockLimited ? t("allInCart", { count: maxQuantity }) : t("limitMax", { count: MAX_PER_ITEM })}{" "}
            <Link href="/cart" className="underline">
              {t("viewCart")}
            </Link>
          </p>
        )}
        {added && (
          <p className="text-rose-dark">
            {t("added")} ·{" "}
            <Link href="/cart" className="underline">
              {t("viewCart")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}