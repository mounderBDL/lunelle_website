"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { PublicPackItem } from "@/lib/api/types";
import { imageUrlOrNull, localized } from "@/lib/format";
import ImagePlaceholder from "./ImagePlaceholder";

/** The items of a pack, spread like a hand of cards. Hover, focus or tap a card to look at it closely. */
export default function PackFan({ items }: { items: PublicPackItem[] }) {
  const t = useTranslations("fan");
  const locale = useLocale();
  const wrap = useRef<HTMLDivElement>(null);
  const touch = useRef(false); // true while the last thing the visitor used was a finger or a pen
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  const n = items.length;
  const step = n > 1 ? Math.min(15, 56 / (n - 1)) : 0;
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const selected = active !== null ? items[active] : null;

  // the cards spread out the first time the fan is seen
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOpen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (n === 0) return null;

  return (
    <div
      ref={wrap}
      data-open={open}
      className="pack-fan mx-auto mt-6"
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setActive(null);
      }}
    >
      <ul className="pack-fan-stage">
        {items.map((item, i) => {
          const itemName = localized(item.productName, locale);
          const image = imageUrlOrNull(item.imageUrl);
          const isActive = active === i;
          return (
            <li
              key={`${item.productSlug}-${item.variantLabel}`}
              data-active={isActive}
              className="pack-fan-card"
              style={
                {
                  "--a": `${(i - (n - 1) / 2) * step}deg`,
                  "--i": i,
                  zIndex: isActive ? 50 : i,
                } as React.CSSProperties
              }
            >
              <Link
                href={`/product/${item.productSlug}`}
                aria-label={`${item.quantity} × ${itemName} (${item.variantLabel})`}
                onPointerDown={(event) => {
                  touch.current = event.pointerType !== "mouse";
                }}
                onKeyDown={() => {
                  touch.current = false;
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setActive(i);
                }}
                onFocus={(event) => {
                  // only keyboard focus lifts the card: a tap also focuses the link, and must not count as the first tap
                  if (event.currentTarget.matches(":focus-visible")) setActive(i);
                }}
                onClick={(event) => {
                  // finger or pen: the first tap lifts the card, the second one opens the product
                  if (touch.current && !isActive) {
                    event.preventDefault();
                    setActive(i);
                  }
                }}
                className="relative block h-full w-full overflow-hidden rounded-2xl border-4 border-white bg-blush shadow-lg outline-offset-2"
              >
                {image ? (
                  <Image src={image} alt="" fill sizes="136px" className="object-cover" />
                ) : (
                  <ImagePlaceholder />
                )}
                {item.quantity > 1 && (
                  <span className="absolute right-2 top-2 rounded-full bg-rose-dark px-2 py-0.5 text-xs font-semibold text-white">
                    × {item.quantity}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" className="mt-8 min-h-14 text-center">
        {selected ? (
          <>
            <p className="font-display text-xl">
              {selected.quantity} ×{" "}
              <span className="font-script text-2xl font-normal">{localized(selected.productName, locale)}</span>
            </p>
            <p className="text-sm text-cocoa/65">
              {selected.variantLabel} ·{" "}
              <Link href={`/product/${selected.productSlug}`} className="underline hover:text-rose-dark">
                {t("view")}
              </Link>
            </p>
          </>
        ) : (
          <p className="text-sm text-cocoa/60">
            {t("inside", { count: units })} · {t("hint")}
          </p>
        )}
      </div>
    </div>
  );
}