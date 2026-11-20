import { getLocale, getTranslations } from "next-intl/server";
import CardGrid from "@/components/CardGrid";
import CollectionsGallery from "@/components/CollectionsGallery";
import FaqSection from "@/components/FaqSection";
import NightHero from "@/components/NightHero";
import IntroCurtain from "@/components/IntroCurtain";
import PackCard from "@/components/PackCard";
import ProductCard from "@/components/ProductCard";
import ReviewsSection from "@/components/ReviewsSection";
import StorySection from "@/components/StorySection";
import { getCategories, getPacks, getProducts, getReviews } from "@/lib/api/catalog";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";

export default async function HomePage() {
  const [t, tp, locale, categories, featured, packs, reviews] = await Promise.all([
    getTranslations("home"),
    getTranslations("product"),
    getLocale(),
    getCategories(),
    getProducts({ featured: true }),
    getPacks(),
    getReviews(),
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
      <IntroCurtain />
      {/* the night hero: a photo that opens on scroll */}
      <NightHero hasPacks={packs.length > 0} />

      {nothingYet && (
        <p className="mx-auto max-w-xl px-4 py-16 text-center font-display text-2xl text-cocoa/70">
          {t("empty")}
        </p>
      )}

      {/* 1. Collections */}
      {collections.length > 0 && (
        <div className="px-3 py-10 sm:px-6">
          {/* a tinted panel: its colour follows the hovered collection (see .collections-panel in globals.css) */}
          <section
            id="collections"
            className="collections-panel mx-auto max-w-7xl scroll-mt-20 rounded-4xl px-4 py-12 sm:px-8 lg:grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:px-12 lg:py-14"
          >
            <div className="reveal text-center lg:text-left">
              <p className="collections-ink text-xs uppercase tracking-[0.3em]">
                {t("collectionsCount", { count: collections.length })}
              </p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">{t("collections")}</h2>
              <span
                aria-hidden
                className="mx-auto mt-6 block h-px w-20 bg-linear-to-r from-gold/0 via-gold to-gold/0 lg:mx-0 lg:from-gold"
              />
              <p className="mx-auto mt-6 max-w-sm text-cocoa/75 lg:mx-0">{t("collectionsText")}</p>
            </div>
            <div className="reveal mt-10 lg:mt-0">
              <CollectionsGallery items={collections} exploreLabel={t("explore")} />
            </div>
          </section>
        </div>
      )}

      {/* 2. Best sellers */}
      {featured.length > 0 && (
        <section id="best-sellers" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="reveal text-center text-4xl">{t("bestSellers")}</h2>
          <CardGrid kind="products" className="reveal mt-10">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} labels={productLabels} />
            ))}
          </CardGrid>
        </section>
      )}

      {/* 3. Packs */}
      {packs.length > 0 && (
        <section id="packs" className="scroll-mt-20 bg-parchment/50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="reveal text-center text-4xl">{t("packs")}</h2>
            <p className="reveal mx-auto mt-3 max-w-xl text-center text-cocoa/70">{t("packsText")}</p>
            <CardGrid kind="packs" className="reveal mt-10">
              {packs.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  locale={locale}
                  labels={packLabels}
                  saveLabel={pack.saving > 0 ? tp("save", { amount: formatMoney(pack.saving, locale) }) : null}
                />
              ))}
            </CardGrid>
          </div>
        </section>
      )}

      {/* 4. Our story  5. Reviews (only when there are some)  6. FAQ */}
      <StorySection />
      <ReviewsSection reviews={reviews} />
      <FaqSection />
    </>
  );
}