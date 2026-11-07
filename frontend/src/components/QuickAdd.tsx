"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { imageUrlOrNull } from "@/lib/format";
import { flyToCart } from "@/lib/motion";
import { MAX_PER_ITEM, useCart, type LineType } from "@/store/cart";
import { useCartUi } from "@/store/cartUi";

const subscribe = () => () => {};

type Props = {
  /** The tailwind aspect class of the card photo, so the button sits in the photo's bottom-right corner. */
  aspect: "aspect-4/5" | "aspect-4/3";
  type: LineType;
  id: string;
  maxQuantity: number;
  imageUrl: string | null;
  /** Set when there is a size to choose: the "+" then opens the product page instead of adding. */
  chooseHref?: string;
};

const BUTTON =
  "pointer-events-auto absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-[3px] border border-rose-dark bg-white/95 text-rose-dark transition hover:bg-rose-dark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-dark active:scale-90 after:absolute after:-inset-2.5 after:content-[''] sm:bottom-3 sm:right-3";

/** The round "+" in the corner of a product or pack card: adds one to the cart without leaving the page. */
export default function QuickAdd({ aspect, type, id, maxQuantity, imageUrl, chooseHref }: Props) {
  const t = useTranslations("product");
  const add = useCart((s) => s.add);
  const openCart = useCartUi((s) => s.openCart);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const inCartRaw = useCart((s) => s.lines.find((l) => l.type === type && l.id === id)?.quantity ?? 0);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [done, setDone] = useState(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const inCart = mounted ? inCartRaw : 0;
  const allowed = Math.max(0, Math.min(maxQuantity, MAX_PER_ITEM) - inCart);

  function addOne() {
    if (allowed === 0) return;
    add({ type, id, quantity: 1 });
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1500);
    const image = imageUrlOrNull(imageUrl);
    flyToCart(button.current, image ? cloudinaryLoader({ src: image, width: 160 }) : null);
  }

  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 ${aspect}`}>
      {chooseHref ? (
        <Link href={chooseHref} aria-label={t("chooseSize")} className={BUTTON}>
          <Plus className="h-2.5 w-2.5" aria-hidden />
        </Link>
      ) : allowed === 0 ? (
        // everything that can be ordered is already in the cart
        <button type="button" onClick={openCart} aria-label={t("viewCart")} className={BUTTON}>
          <Check className="h-2.5 w-2.5" aria-hidden />
        </button>
      ) : (
        <button
          ref={button}
          type="button"
          onClick={addOne}
          aria-label={done ? t("addedShort") : t("addToCart")}
          className={BUTTON}
        >
          {done ? <Check className="h-2.5 w-2.5" aria-hidden /> : <Plus className="h-2.5 w-2.5" aria-hidden />}
        </button>
      )}
    </div>
  );
}