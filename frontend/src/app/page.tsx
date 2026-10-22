import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import PackCard from "@/components/PackCard";
import ProductCard from "@/components/ProductCard";
import { getCategories, getPacks, getProducts } from "@/lib/api/catalog";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";

export default async function HomePage() {
  const [t, tp, locale, categories, featured, packs] = await Promise.all([
    getTranslations("home"),
    getTranslations("product"),
    getLocale(),
    getCategories(),
    getProducts({ featured: true }),
    getPacks(),
  ]);

  const productLabels = { from: tp("from"), outOfStock: tp("outOfStock"), sale: tp("sale") };
  const packLabels = { outOfStock: tp("outOfStock"), pack: tp("pack") };
  const nothingYet = categories.length === 0 && featured.length === 0 && packs.length === 0;

  return (
    <>
      {/* Hero */}
      <section className="bg-linear-to-b from-blush/70 via-cream to-cream">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-dark">{t("heroEyebrow")}</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-5xl leading-tight sm:text-7xl">{t("heroTitle")}</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-cocoa/75">{t("heroText")}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#collections"
              className="rounded-full bg-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa"
            >
              {t("shop")}
            </a>
            {packs.length > 0 && (
              <a
                href="#packs"
                className="rounded-full border border-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-rose-dark transition-colors hover:bg-blush"
              >
                {t("packsCta")}
              </a>
            )}
          </div>
        </div>
      </section>

      {nothingYet && (
        <p className="mx-auto max-w-xl px-4 py-16 text-center font-display text-2xl text-cocoa/70">
          {t("empty")}
        </p>
      )}

      {/* Collections */}
      {categories.length > 0 && (
        <section id="collections" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-center text-4xl">{t("collections")}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => {
              const name = localized(category.name, locale);
              const image = imageUrlOrNull(category.imageUrl);
              return (
                <Link key={category.id} href={`/category/${category.slug}`} className="group block">
                  <div className="relative aspect-4/5 overflow-hidden rounded-t-full rounded-b-2xl bg-blush/60">
                    {image ? (
                      <Image
                        src={image}
                        alt={name}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  <h3 className="mt-4 text-center text-2xl">{name}</h3>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Favourites */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-4xl">{t("favourites")}</h2>
          <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} labels={productLabels} />
            ))}
          </div>
        </section>
      )}

      {/* Packs */}
      {packs.length > 0 && (
        <section id="packs" className="scroll-mt-20 bg-parchment/50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-4xl">{t("packs")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-cocoa/70">{t("packsText")}</p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  locale={locale}
                  labels={packLabels}
                  saveLabel={pack.saving > 0 ? tp("save", { amount: formatMoney(pack.saving, locale) }) : null}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}