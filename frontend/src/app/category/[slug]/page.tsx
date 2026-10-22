import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import ProductCard from "@/components/ProductCard";
import { loadCategories, loadProducts } from "@/lib/api/catalog";
import { localized } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [categories, locale] = await Promise.all([loadCategories(), getLocale()]);
  const category = categories.find((c) => c.slug === slug);
  return { title: category ? localized(category.name, locale) : "Lunelle" };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [t, tp, tc, locale, categories, products] = await Promise.all([
    getTranslations("category"),
    getTranslations("product"),
    getTranslations("common"),
    getLocale(),
    loadCategories(),
    loadProducts({ category: slug }),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) {
    notFound();
  }

  const name = localized(category.name, locale);
  const description = localized(category.description, locale);
  const labels = { from: tp("from"), outOfStock: tp("outOfStock"), sale: tp("sale") };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-cocoa/60">
        <Link href="/" className="hover:text-rose-dark">
          {tc("home")}
        </Link>{" "}
        / <span className="text-cocoa">{name}</span>
      </nav>

      <header className="mx-auto mt-8 max-w-2xl text-center">
        <h1 className="text-5xl">{name}</h1>
        {description && <p className="mt-4 whitespace-pre-line text-cocoa/75">{description}</p>}
      </header>

      {products.length === 0 ? (
        <p className="mt-16 text-center font-display text-2xl text-cocoa/70">{t("empty")}</p>
      ) : (
        <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}