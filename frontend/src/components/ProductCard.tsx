import Image from "next/image";
import Link from "next/link";
import type { PublicProduct } from "@/lib/api/types";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import ImagePlaceholder from "./ImagePlaceholder";
import TiltFrame from "./TiltFrame";
import QuickAdd from "./QuickAdd";

type Props = {
  product: PublicProduct;
  locale: string;
  labels: { from: string; outOfStock: string; sale: string };
};

export default function ProductCard({ product, locale, labels }: Props) {
  const name = localized(product.name, locale);
  const image = imageUrlOrNull(product.images[0]?.url);
  const cheapest = product.variants.length
    ? product.variants.reduce((a, b) => (a.finalPrice <= b.finalPrice ? a : b))
    : null;
  const multipleSizes = product.variants.length > 1;
  const onSale = product.onSale && cheapest !== null && cheapest.finalPrice < cheapest.price;
  const tag = onSale ? labels.sale : product.badge;
  const only = product.variants.length === 1 ? product.variants[0] : null; // one size: add straight away

  return (
    <div className="relative">
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-2xl outline-offset-4 transition-transform duration-200 active:scale-[0.985]"
    >
      <TiltFrame className="relative aspect-4/5 overflow-hidden rounded-2xl bg-blush/60">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
              product.inStock ? "" : "opacity-60 grayscale"
            }`}
          />
        ) : (
          <ImagePlaceholder />
        )}

        {tag && product.inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-rose-dark px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white">
            {tag}
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-cocoa/85 px-4 py-1 text-xs uppercase tracking-wider text-white">
            {labels.outOfStock}
          </span>
        )}
      </TiltFrame>

      <div className="mt-4 text-center">
        <h3 className="font-display text-xl">{name}</h3>
        {cheapest && (
          <p className="mt-1 text-sm text-cocoa/80">
            {multipleSizes && <span className="mr-1 text-cocoa/60">{labels.from}</span>}
            {onSale && (
              <span className="mr-2 text-cocoa/50 line-through">{formatMoney(cheapest.price, locale)}</span>
            )}
            <span className={onSale ? "font-semibold text-rose-dark" : ""}>
              {formatMoney(cheapest.finalPrice, locale)}
            </span>
          </p>
        )}
      </div>
    </Link>

    {product.inStock && only && (
      <QuickAdd
        aspect="aspect-4/5"
        type="VARIANT"
        id={only.id}
        maxQuantity={only.maxQuantity}
        imageUrl={product.images[0]?.url ?? null}
      />
    )}
    {product.inStock && multipleSizes && (
      <QuickAdd
        aspect="aspect-4/5"
        type="VARIANT"
        id={product.id}
        maxQuantity={0}
        imageUrl={null}
        chooseHref={`/product/${product.slug}`}
      />
    )}
    </div>
  );
}