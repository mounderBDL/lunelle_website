"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type GalleryItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
};

/**
 * Computers: a compact row of equal strips. Only the one under the cursor (or focused) widens.
 * Phones and tablets: a swipeable carousel that snaps card by card.
 */
export default function CollectionsGallery({ items, exploreLabel }: { items: GalleryItem[]; exploreLabel: string }) {
  // nothing is open by default
  const [active, setActive] = useState<number | null>(null);
  const hovering = active !== null && active < items.length;

  return (
    <ul
      className="collections-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 lg:snap-none lg:overflow-visible lg:pb-0"
      data-hovering={hovering}
      style={{ "--n": items.length } as React.CSSProperties}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setActive(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
      }}
    >
      {items.map((item, i) => {
        const isActive = i === active;
        return (
          <li
            key={item.id}
            data-active={isActive}
            style={{ "--grow": isActive ? 4 : 1 } as React.CSSProperties}
            className="collection-strip"
          >
            <Link
              href={`/category/${item.slug}`}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setActive(i);
              }}
              onFocus={() => setActive(i)}
              className="group relative block h-full overflow-hidden rounded-2xl bg-linear-to-br from-petal-400 via-petal-500 to-petal-700 outline-offset-4"
            >
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, 70vw"
                  className="collection-photo object-cover"
                />
              )}
              <div aria-hidden className="absolute inset-0 bg-linear-to-t from-cocoa/75 via-cocoa/10 to-transparent" />
              <div aria-hidden className="collection-dim absolute inset-0 bg-cocoa/25" />

              <span
                aria-hidden
                className="collection-vertical absolute bottom-5 left-1/2 hidden -translate-x-1/2 rotate-180 font-display text-2xl tracking-wide text-white [writing-mode:vertical-rl] lg:block"
              >
                {item.name}
              </span>

              <div className="collection-detail absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="font-display text-3xl leading-tight text-white lg:text-3xl">{item.name}</h3>
                {item.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-white/85 lg:line-clamp-3">{item.description}</p>
                )}
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-rose-dark transition-colors group-hover:bg-white">
                  {exploreLabel}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}