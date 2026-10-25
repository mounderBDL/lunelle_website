"use client";

import { useQuery } from "@tanstack/react-query";
import { Gift, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { adminFetch } from "@/lib/admin/api";
import type { AdminPack } from "@/lib/admin/catalogTypes";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import { Skeleton } from "./Card";
import { Chip, INPUT, PRIMARY, SECONDARY } from "./FormBits";

export default function PacksView() {
  const t = useTranslations("admin.packs");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const packs = useQuery({
    queryKey: ["admin", "packs", "all"],
    queryFn: () => adminFetch<AdminPack[]>("/api/admin/packs?includeArchived=true"),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (packs.data ?? []).filter((p) => {
      if (!showArchived && p.archived) return false;
      if (!term) return true;
      return `${p.name.en ?? ""} ${p.name.fr ?? ""}`.toLowerCase().includes(term);
    });
  }, [packs.data, search, showArchived]);

  const total = (packs.data ?? []).filter((p) => showArchived || !p.archived).length;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-1 text-cocoa/60">{t("subtitle", { count: total })}</p>
        </div>
        <Link href="/admin/packs/new" className={`${PRIMARY} flex items-center gap-2`}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("new")}
        </Link>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-4">
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
        {packs.isPending ? (
          <Skeleton />
        ) : packs.isError ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-8 text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void packs.refetch()} className={`${SECONDARY} mt-4`}>
              {t("retry")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-12 text-center">
            <Gift className="mx-auto h-10 w-10 text-rose/60" aria-hidden />
            <p className="mt-4 font-display text-2xl">{(packs.data ?? []).length === 0 ? t("empty") : t("noMatch")}</p>
            {(packs.data ?? []).length === 0 && <p className="mt-2 text-sm text-cocoa/60">{t("emptyHint")}</p>}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {filtered.map((p) => {
              const name = localized(p.name, locale);
              const image = imageUrlOrNull(p.imageUrl);
              const hasSaving = p.saving > 0;
              return (
                <li key={p.id}>
                  <Link
                    href={`/admin/packs/${p.id}`}
                    className={`flex h-full gap-4 rounded-3xl border border-petal-200/70 bg-white/75 p-4 shadow-sm transition-colors hover:bg-petal-50 ${
                      p.archived ? "opacity-70" : ""
                    }`}
                  >
                    <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-petal-100">
                      {image ? (
                        <Image src={image} alt={name} fill sizes="112px" className="object-cover" />
                      ) : (
                        <ImagePlaceholder />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold">{name}</p>
                      <p className="mt-1 text-sm tabular-nums">
                        {hasSaving && (
                          <span className="mr-2 text-cocoa/40 line-through">{formatMoney(p.individualTotal, locale)}</span>
                        )}
                        <span className="font-bold text-petal-700">{formatMoney(p.price, locale)}</span>
                      </p>
                      {p.margin !== null && (
                        <p className={`text-xs tabular-nums ${p.margin < 0 ? "font-semibold text-red-700" : "text-cocoa/60"}`}>
                          {t("margin")}: {formatMoney(p.margin, locale)}
                        </p>
                      )}
                      <p className="mt-1.5 line-clamp-2 text-xs text-cocoa/60">
                        {p.items
                          .map((i) => `${i.quantity} × ${localized(i.productName, locale)} (${i.variantLabel})`)
                          .join(" · ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hasSaving && <Chip tone="sage">{t("saving", { amount: formatMoney(p.saving, locale) })}</Chip>}
                        {!hasSaving && !p.archived && <Chip tone="amber">{t("chips.noSaving")}</Chip>}
                        {p.archived && <Chip tone="stone">{t("chips.archived")}</Chip>}
                        {!p.active && !p.archived && <Chip tone="stone">{t("chips.hidden")}</Chip>}
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