import Image from "next/image";
import Link from "next/link";
import type { PublicPack } from "@/lib/api/types";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import TiltFrame from "./TiltFrame";
import PackFanMini from "./PackFanMini";

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
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              pack.inStock ? "" : "opacity-60 grayscale"
            }`}
          />
        ) : (
          <PackFanMini items={pack.items} />
        )}
        <span className="absolute left-4 top-4 rounded-full bg-parchment px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-rose-dark">
          {labels.pack}
        </span>
        {!pack.inStock && (
          <span className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-cocoa/85 px-4 py-1 text-xs uppercase tracking-wider text-white">
            {labels.outOfStock}
          </span>
        )}
      </TiltFrame>

      <div className="mt-4 text-center">
        <h3 className="font-display text-xl">{name}</h3>
        <p className="mt-1 text-sm text-cocoa/80">
          {saveLabel && (
            <span className="mr-2 text-cocoa/50 line-through">{formatMoney(pack.individualTotal, locale)}</span>
          )}
          <span className="font-semibold text-rose-dark">{formatMoney(pack.price, locale)}</span>
        </p>
        {saveLabel && <p className="mt-1 text-xs uppercase tracking-wider text-gold">{saveLabel}</p>}
      </div>
    </Link>
  );
}