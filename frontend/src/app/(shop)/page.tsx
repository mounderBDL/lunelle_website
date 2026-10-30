import { getLocale, getTranslations } from "next-intl/server";
import CollectionsGallery from "@/components/CollectionsGallery";
import HomeHero from "@/components/HomeHero";
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

  const collections = categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: localized(category.name, locale),
    description: localized(category.description, locale),
    imageUrl: imageUrlOrNull(category.imageUrl),
  }));

  return (
    <>
      <HomeHero hasPacks={packs.length > 0} />

      {nothingYet && (
        <p className="mx-auto max-w-xl px-4 py-16 text-center font-display text-2xl text-cocoa/70">
          {t("empty")}
        </p>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <section id="collections" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="reveal text-center text-4xl">{t("collections")}</h2>
          <div className="reveal mt-10">
            <CollectionsGallery items={collections} exploreLabel={t("explore")} />
          </div>
        </section>
      )}

      {/* Favourites */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="reveal text-center text-4xl">{t("favourites")}</h2>
          <div className="reveal mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
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
            <h2 className="reveal text-center text-4xl">{t("packs")}</h2>
            <p className="reveal mx-auto mt-3 max-w-xl text-center text-cocoa/70">{t("packsText")}</p>
            <div className="reveal mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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