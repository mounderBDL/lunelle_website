"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useSyncExternalStore } from "react";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { imageUrlOrNull } from "@/lib/format";
import { flyToCart } from "@/lib/motion";
import { MAX_PER_ITEM, useCart } from "@/store/cart";
import { useCartUi } from "@/store/cartUi";
import QuantityStepper from "./QuantityStepper";

const subscribe = () => () => {};

type Props = { packId: string; inStock: boolean; maxQuantity: number; imageUrl: string | null };

export default function PackPurchase({ packId, inStock, maxQuantity, imageUrl }: Props) {
  const t = useTranslations("product");
  const add = useCart((s) => s.add);
  const openCart = useCartUi((s) => s.openCart);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const inCartRaw = useCart((s) => s.lines.find((l) => l.type === "PACK" && l.id === packId)?.quantity ?? 0);
  const addRef = useRef<HTMLButtonElement>(null);

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

  const viewCart = (
    <button type="button" onClick={openCart} className="underline">
      {t("viewCart")}
    </button>
  );

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
          ref={addRef}
          type="button"
          onClick={() => {
            if (!canBuy) return;
            add({ type: "PACK", id: packId, quantity: qty });
            setAdded(true);
            setNotice(null);
            const image = imageUrlOrNull(imageUrl);
            flyToCart(addRef.current, image ? cloudinaryLoader({ src: image, width: 160 }) : null);
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
            {stockLimited ? t("allInCart", { count: maxQuantity }) : t("limitMax", { count: MAX_PER_ITEM })} {viewCart}
          </p>
        )}
        {added && (
          <p className="text-rose-dark">
            {t("added")} · {viewCart}
          </p>
        )}
      </div>
    </div>
  );
}