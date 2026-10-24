import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import PackPurchase from "@/components/PackPurchase";
import { loadPack } from "@/lib/api/catalog";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [pack, locale] = await Promise.all([loadPack(slug), getLocale()]);
  if (!pack) {
    return { title: "Lunelle" };
  }
  return {
    title: localized(pack.name, locale),
    description: localized(pack.description, locale).slice(0, 160) || undefined,
  };
}

export default async function PackPage({ params }: Props) {
  const { slug } = await params;
  const [t, tc, locale, pack] = await Promise.all([
    getTranslations("packs"),
    getTranslations("common"),
    getLocale(),
    loadPack(slug),
  ]);

  if (!pack) {
    notFound();
  }

  const name = localized(pack.name, locale);
  const description = localized(pack.description, locale);
  const image = imageUrlOrNull(pack.imageUrl);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-cocoa/60">
        <Link href="/" className="hover:text-rose-dark">
          {tc("home")}
        </Link>{" "}
        /{" "}
        <Link href="/packs" className="hover:text-rose-dark">
          {t("title")}
        </Link>{" "}
        / <span className="text-cocoa">{name}</span>
      </nav>

      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="relative aspect-4/5 overflow-hidden rounded-t-full rounded-b-2xl bg-blush/60">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className={`object-cover ${pack.inStock ? "" : "opacity-70 grayscale"}`}
            />
          ) : (
            <ImagePlaceholder />
          )}
        </div>

        <div>
          <h1 className="text-4xl sm:text-5xl">{name}</h1>

          <div className="mt-6">
            {pack.saving > 0 && (
              <p className="text-sm text-cocoa/60">
                {t("separately")}:{" "}
                <span className="line-through">{formatMoney(pack.individualTotal, locale)}</span>
              </p>
            )}
            <p className="mt-1 flex items-baseline gap-3">
              <span className="text-xs uppercase tracking-wider text-cocoa/70">{t("packPrice")}</span>
              <span className="text-3xl text-rose-dark">{formatMoney(pack.price, locale)}</span>
            </p>
            {pack.saving > 0 && (
              <p className="mt-2 text-sm uppercase tracking-wider text-gold">
                {t("save", { amount: formatMoney(pack.saving, locale) })}
              </p>
            )}
          </div>

          {description && <p className="mt-6 whitespace-pre-line text-cocoa/80">{description}</p>}

          <div className="mt-8">
            <PackPurchase packId={pack.id} inStock={pack.inStock} maxQuantity={pack.maxQuantity} />
          </div>

          <section className="mt-10">
            <h2 className="text-2xl">{t("contains")}</h2>
            <ul className="mt-4 space-y-3">
              {pack.items.map((item) => {
                const itemName = localized(item.productName, locale);
                const thumb = imageUrlOrNull(item.imageUrl);
                return (
                  <li key={`${item.productSlug}-${item.variantLabel}`}>
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="flex items-center gap-4 rounded-xl border border-rose/20 p-3 transition-colors hover:bg-blush/50"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-blush/60">
                        {thumb ? (
                          <Image src={thumb} alt={itemName} fill sizes="56px" className="object-cover" />
                        ) : (
                          <ImagePlaceholder />
                        )}
                      </div>
                      <span>
                        <span className="block font-display text-lg leading-tight">
                          {item.quantity} × {itemName}
                        </span>
                        <span className="block text-sm text-cocoa/70">{item.variantLabel}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}