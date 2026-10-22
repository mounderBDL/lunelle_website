import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchase from "@/components/ProductPurchase";
import ScentNotes from "@/components/ScentNotes";
import { loadCategories, loadProduct } from "@/lib/api/catalog";
import { imageUrlOrNull, localized } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([loadProduct(slug), getLocale()]);
  if (!product) {
    return { title: "Lunelle" };
  }
  return {
    title: localized(product.name, locale),
    description: localized(product.description, locale).slice(0, 160) || undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [t, tc, locale, product, categories] = await Promise.all([
    getTranslations("product"),
    getTranslations("common"),
    getLocale(),
    loadProduct(slug),
    loadCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const name = localized(product.name, locale);
  const description = localized(product.description, locale);
  const notes = localized(product.scentNotes, locale);
  const category = categories.find((c) => c.slug === product.categorySlug);
  const images = product.images.flatMap((image) => {
    const url = imageUrlOrNull(image.url);
    return url ? [{ id: image.id, url }] : [];
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-cocoa/60">
        <Link href="/" className="hover:text-rose-dark">
          {tc("home")}
        </Link>{" "}
        /{" "}
        {category && (
          <>
            <Link href={`/category/${category.slug}`} className="hover:text-rose-dark">
              {localized(category.name, locale)}
            </Link>{" "}
            /{" "}
          </>
        )}
        <span className="text-cocoa">{name}</span>
      </nav>

      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
        <ProductGallery images={images} alt={name} inStock={product.inStock} />

        <div>
          <h1 className="text-4xl sm:text-5xl">{name}</h1>
          <div className="mt-6">
            <ProductPurchase product={product} />
          </div>

          {product.personalized && (
            <p className="mt-6 rounded-xl bg-parchment/70 px-5 py-4 text-sm text-cocoa/80">{t("personalized")}</p>
          )}

          {description && (
            <section className="mt-10">
              <h2 className="text-2xl">{t("description")}</h2>
              <p className="mt-3 whitespace-pre-line text-cocoa/80">{description}</p>
            </section>
          )}

          {notes.trim() && (
            <section className="mt-10">
              <h2 className="text-2xl">{t("notes")}</h2>
              <div className="mt-3">
                <ScentNotes text={notes} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}