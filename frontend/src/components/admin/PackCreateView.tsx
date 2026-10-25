"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { adminFetch } from "@/lib/admin/api";
import type { AdminProduct } from "@/lib/admin/catalogTypes";
import Card, { Skeleton } from "./Card";
import { SECONDARY } from "./FormBits";
import PackEditor from "./PackEditor";

export default function PackCreateView() {
  const t = useTranslations("admin.packs");
  const products = useQuery({
    queryKey: ["admin", "products", "catalog"],
    queryFn: () => adminFetch<AdminProduct[]>("/api/admin/products"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const usable = (products.data ?? []).filter((p) => p.active && !p.archived);

  return (
    <div>
      <Link
        href="/admin/packs"
        className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa/70 hover:text-petal-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">{t("createTitle")}</h1>
      <p className="mt-1 text-cocoa/60">{t("createHint")}</p>

      <div className="mt-8">
        {products.isPending ? (
          <Skeleton />
        ) : products.isError ? (
          <Card className="text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void products.refetch()} className={`${SECONDARY} mt-4`}>
              {t("retry")}
            </button>
          </Card>
        ) : usable.length === 0 ? (
          <Card className="text-center">
            <p className="text-cocoa/75">{t("needProducts")}</p>
            <Link href="/admin/products" className={`${SECONDARY} mt-4 inline-block`}>
              {t("needProductsAction")}
            </Link>
          </Card>
        ) : (
          <PackEditor products={products.data} />
        )}
      </div>
    </div>
  );
}