"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalogTypes";
import { localized } from "@/lib/format";
import ArchiveCard from "./ArchiveCard";
import Card, { Skeleton } from "./Card";
import DiscountCard from "./DiscountCard";
import { Chip, SECONDARY } from "./FormBits";
import PhotosManager from "./PhotosManager";
import ProductForm from "./ProductForm";
import SizesManager from "./SizesManager";

export default function ProductEditView({ id }: { id: string }) {
  const t = useTranslations("admin.products");
  const locale = useLocale();

  const product = useQuery({
    queryKey: ["admin", "products", id],
    queryFn: () => adminFetch<AdminProduct>(`/api/admin/products/${id}`),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => adminFetch<AdminCategory[]>("/api/admin/categories"),
  });

  const back = (
    <Link
      href="/admin/products"
      className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa/70 hover:text-petal-700"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {t("back")}
    </Link>
  );

  if (product.isPending || categories.isPending) {
    return (
      <div>
        {back}
        <div className="mt-6">
          <Skeleton />
        </div>
      </div>
    );
  }

  if (product.isError || categories.isError) {
    const missing = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div>
        {back}
        <Card className="mt-6 text-center">
          <p className="text-cocoa/75">{missing ? t("notFound") : t("loadError")}</p>
          {!missing && (
            <button
              type="button"
              onClick={() => {
                void product.refetch();
                void categories.refetch();
              }}
              className={`${SECONDARY} mt-4`}
            >
              {t("retry")}
            </button>
          )}
        </Card>
      </div>
    );
  }

  const p = product.data;
  const name = localized(p.name, locale);

  return (
    <div>
      {back}

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.archived && <Chip tone="stone">{t("chips.archived")}</Chip>}
            {!p.active && !p.archived && <Chip tone="stone">{t("chips.hidden")}</Chip>}
            {p.discount.effective && <Chip tone="pink">{t("chips.sale")}</Chip>}
            {p.featured && <Chip tone="amber">{t("chips.featured")}</Chip>}
            {!p.inStock && !p.archived && <Chip tone="terracotta">{t("chips.outOfStock")}</Chip>}
          </div>
        </div>
        {p.active && !p.archived && (
          <a
            href={`/product/${p.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SECONDARY} inline-flex items-center gap-2`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("viewInShop")}
          </a>
        )}
      </header>

      <div className="mt-8 space-y-6">
        <ProductForm key={String(p.archived)} categories={categories.data} product={p} />
        <PhotosManager product={p} />
        <SizesManager product={p} />
        <DiscountCard key={`${p.discount.active}-${p.discount.value}-${p.discount.type}`} product={p} />
        <ArchiveCard product={p} />
      </div>
    </div>
  );
}