"use client";

import { useQuery } from "@tanstack/react-query";
import { Flower2, Plus, Search, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { adminFetch } from "@/lib/admin/api";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalogTypes";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import { Skeleton } from "./Card";
import { Chip, INPUT, PRIMARY, SECONDARY } from "./FormBits";

export default function ProductsView() {
  const t = useTranslations("admin.products");
  const locale = useLocale();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const products = useQuery({
    queryKey: ["admin", "products", "all"],
    queryFn: () => adminFetch<AdminProduct[]>("/api/admin/products?includeArchived=true"),
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => adminFetch<AdminCategory[]>("/api/admin/categories"),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products.data ?? []).filter((p) => {
      if (!showArchived && p.archived) return false;
      if (category && p.categoryId !== category) return false;
      if (!term) return true;
      return `${p.name.en ?? ""} ${p.name.fr ?? ""}`.toLowerCase().includes(term);
    });
  }, [products.data, category, search, showArchived]);

  const total = (products.data ?? []).filter((p) => showArchived || !p.archived).length;

  const chip = (value: string, label: string) => (
    <li key={value || "all"} className="shrink-0">
      <button
        type="button"
        onClick={() => setCategory(value)}
        aria-pressed={category === value}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          category === value
            ? "bg-petal-700 text-white"
            : "border border-petal-200 bg-white/70 text-cocoa/80 hover:bg-petal-100"
        }`}
      >
        {label}
      </button>
    </li>
  );

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-1 text-cocoa/60">{t("subtitle", { count: total })}</p>
        </div>
        <Link href="/admin/products/new" className={`${PRIMARY} flex items-center gap-2`}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("new")}
        </Link>
      </header>

      <nav aria-label={t("title")} className="mt-6">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {chip("", t("allCategories"))}
          {(categories.data ?? []).map((c) => chip(c.id, localized(c.name, locale)))}
        </ul>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa/40" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className={`${INPUT} border-petal-300/70 pl-11`}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-cocoa/80">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 accent-petal-700"
          />
          {t("showArchived")}
        </label>
      </div>

      <div className="mt-6">
        {products.isPending ? (
          <Skeleton />
        ) : products.isError ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-8 text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void products.refetch()} className={`${SECONDARY} mt-4`}>
              {t("retry")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-12 text-center">
            <Flower2 className="mx-auto h-10 w-10 text-rose/60" aria-hidden />
            <p className="mt-4 font-display text-2xl">
              {(products.data ?? []).length === 0 ? t("empty") : t("noMatch")}
            </p>
            {(products.data ?? []).length === 0 && <p className="mt-2 text-sm text-cocoa/60">{t("emptyHint")}</p>}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => {
              const name = localized(p.name, locale);
              const image = imageUrlOrNull(p.images[0]?.url);
              const cheapest = p.variants.length
                ? p.variants.reduce((a, b) => (a.finalPrice <= b.finalPrice ? a : b))
                : null;
              const onSale = p.discount.effective && cheapest !== null && cheapest.finalPrice < cheapest.price;
              return (
                <li key={p.id}>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className={`flex h-full gap-4 rounded-3xl border border-petal-200/70 bg-white/75 p-4 shadow-sm transition-colors hover:bg-petal-50 ${
                      p.archived ? "opacity-70" : ""
                    }`}
                  >
                    <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-petal-100">
                      {image ? (
                        <Image src={image} alt={name} fill sizes="96px" className="object-cover" />
                      ) : (
                        <ImagePlaceholder />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-lg font-bold">
                        {p.featured && <Star className="h-4 w-4 shrink-0 fill-gold text-gold" aria-label={t("chips.featured")} />}
                        <span className="truncate">{name}</span>
                      </p>
                      <p className="truncate text-sm text-cocoa/60">{localized(p.categoryName, locale)}</p>

                      {cheapest && (
                        <p className="mt-1 text-sm tabular-nums">
                          {p.variants.length > 1 && <span className="mr-1 text-cocoa/60">{t("from")}</span>}
                          {onSale && (
                            <span className="mr-2 text-cocoa/40 line-through">{formatMoney(cheapest.price, locale)}</span>
                          )}
                          <span className={onSale ? "font-bold text-petal-700" : "font-semibold"}>
                            {formatMoney(cheapest.finalPrice, locale)}
                          </span>
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.variants.map((v) => (
                          <Chip key={v.id} tone={v.stock === 0 ? "terracotta" : v.stock <= 3 ? "amber" : "sage"}>
                            {v.label} · {v.stock}
                          </Chip>
                        ))}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.archived && <Chip tone="stone">{t("chips.archived")}</Chip>}
                        {!p.active && !p.archived && <Chip tone="stone">{t("chips.hidden")}</Chip>}
                        {onSale && <Chip tone="pink">{t("chips.sale")}</Chip>}
                        {!p.inStock && !p.archived && <Chip tone="terracotta">{t("chips.outOfStock")}</Chip>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}