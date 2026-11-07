import Image from "next/image";
import Link from "next/link";
import type { PublicPack } from "@/lib/api/types";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import PackFanMini from "./PackFanMini";
import TiltFrame from "./TiltFrame";
import QuickAdd from "./QuickAdd";

type Props = {
  pack: PublicPack;
  locale: string;
  saveLabel: string | null;
  labels: { outOfStock: string; pack: string };
};

export default function PackCard({ pack, locale, saveLabel, labels }: Props) {
  const name = localized(pack.name, locale);
  const image = imageUrlOrNull(pack.imageUrl);

  return (
    <div className="relative">
    <Link
      href={`/pack/${pack.slug}`}
      className="group block rounded-2xl outline-offset-4 transition-transform duration-200 active:scale-[0.985]"
    >
      <TiltFrame className="relative aspect-4/3 overflow-hidden rounded-2xl bg-blush/60">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 33vw, 50vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              pack.inStock ? "" : "opacity-60 grayscale"
            }`}
          />
        ) : (
          <PackFanMini items={pack.items} />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-parchment px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-dark sm:left-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[11px]">
          {labels.pack}
        </span>
        {!pack.inStock && (
          <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-cocoa/85 px-3 py-1 text-[10px] uppercase tracking-wider text-white sm:bottom-4 sm:px-4 sm:text-xs">
            {labels.outOfStock}
          </span>
        )}
      </TiltFrame>

      <div className="mt-3 text-center sm:mt-4">
        <h3 className="font-display text-lg leading-tight sm:text-xl">{name}</h3>
        <p className="mt-1 text-xs leading-snug text-cocoa/80 sm:text-sm">
          {saveLabel && (
            <span className="mr-1.5 text-cocoa/50 line-through sm:mr-2">{formatMoney(pack.individualTotal, locale)}</span>
          )}
          <span className="font-semibold text-rose-dark">{formatMoney(pack.price, locale)}</span>
        </p>
        {saveLabel && <p className="mt-1 text-[10px] uppercase tracking-wide text-gold sm:text-xs sm:tracking-wider">{saveLabel}</p>}
      </div>
    </Link>

    {pack.inStock && (
      <QuickAdd aspect="aspect-4/3" type="PACK" id={pack.id} maxQuantity={pack.maxQuantity} imageUrl={pack.imageUrl} />
    )}
    </div>
  );
}