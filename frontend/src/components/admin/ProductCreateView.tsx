"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { adminFetch } from "@/lib/admin/api";
import type { AdminCategory } from "@/lib/admin/catalogTypes";
import Card, { Skeleton } from "./Card";
import { SECONDARY } from "./FormBits";
import ProductForm from "./ProductForm";

export default function ProductCreateView() {
  const t = useTranslations("admin.products");
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => adminFetch<AdminCategory[]>("/api/admin/categories"),
  });

  return (
    <div>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa/70 hover:text-petal-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">{t("createTitle")}</h1>
      <p className="mt-1 text-cocoa/60">{t("createHint")}</p>

      <div className="mt-8">
        {categories.isPending ? (
          <Skeleton />
        ) : categories.isError ? (
          <Card className="text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void categories.refetch()} className={`${SECONDARY} mt-4`}>
              {t("retry")}
            </button>
          </Card>
        ) : categories.data.length === 0 ? (
          <Card className="text-center">
            <p className="text-cocoa/75">{t("needCategory")}</p>
            <Link href="/admin/categories" className={`${SECONDARY} mt-4 inline-block`}>
              {t("needCategoryAction")}
            </Link>
          </Card>
        ) : (
          <ProductForm categories={categories.data} />
        )}
      </div>
    </div>
  );
}