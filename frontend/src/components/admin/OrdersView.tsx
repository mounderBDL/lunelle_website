"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Hand, Moon, RefreshCw, Search, SlidersHorizontal, Store, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import { formatPhone, timeAgo } from "@/lib/admin/format";
import { useOrderCounts } from "@/lib/admin/hooks";
import type { OrderListItem, Page } from "@/lib/admin/types";
import { useNow } from "@/lib/admin/useNow";
import type { DeliveryMethod, OrderStatus } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import CallDueBadge from "./CallDueBadge";
import StatusChip from "./StatusChip";

const PAGE_SIZE = 20;
const STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "NO_ANSWER", "RETURNED"];
const METHODS: DeliveryMethod[] = ["HAND_TO_HAND", "HOME", "STOP_DESK"];
const METHOD_ICON = { HAND_TO_HAND: Hand, HOME: Truck, STOP_DESK: Store } as const;

const FIELD =
  "w-full rounded-xl border border-rose/30 bg-white/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-rose-dark focus:ring-2 focus:ring-rose/30";

export default function OrdersView() {
  const t = useTranslations("admin.orders");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const nowMs = useNow();
  const counts = useOrderCounts();
  const ts = useTranslations("admin.status");

  // ── filters live in the URL, so the back button and shared links keep them ──
  const statusParam = search.get("status");
  const status = STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : "";
  const methodParam = search.get("method");
  const method = METHODS.includes(methodParam as DeliveryMethod) ? (methodParam as DeliveryMethod) : "";
  const q = search.get("q") ?? "";
  const from = search.get("from") ?? "";
  const to = search.get("to") ?? "";
  const page = Math.max(0, Number.parseInt(search.get("page") ?? "0", 10) || 0);
  const hasFilters = Boolean(status || q || method || from || to);

  const [text, setText] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(Boolean(method || from || to));

  const update = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || value === 0) next.delete(key);
        else next.set(key, String(value));
      }
      if (!("page" in patch)) next.delete("page"); // any filter change goes back to the first page
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [search, router, pathname],
  );

  // search as you type, after a short pause
  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === q) return;
    const id = window.setTimeout(() => update({ q: trimmed }), 400);
    return () => window.clearTimeout(id);
  }, [text, q, update]);

  const list = useQuery({
    queryKey: ["orders", "list", { status, q, method, from, to, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      if (method) params.set("deliveryMethod", method);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      return adminFetch<Page<OrderListItem>>(`/api/admin/orders?${params}`);
    },
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const rows = list.data?.items ?? [];
  const totalElements = list.data?.totalElements ?? 0;
  const totalPages = list.data?.totalPages ?? 0;
  const firstShown = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastShown = Math.min(totalElements, (page + 1) * PAGE_SIZE);
  const allCount = counts.data ? Object.values(counts.data).reduce((a, b) => a + b, 0) : null;

  function clearFilters() {
    setText("");
    router.replace(pathname, { scroll: false });
  }

  function destination(order: OrderListItem) {
    if (order.deliveryMethod === "HAND_TO_HAND") return t("method.HAND_TO_HAND");
    return [order.communeName, order.wilayaName].filter(Boolean).join(", ");
  }

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const chip = (value: OrderStatus | "", label: string, count: number | null) => {
    const active = status === value;
    return (
      <li key={value || "all"} className="shrink-0">
        <button
          type="button"
          onClick={() => update({ status: value })}
          aria-pressed={active}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active ? "bg-petal-700 text-white" : "border border-rose/20 bg-white/70 text-cocoa/80 hover:bg-blush"
          }`}
        >
          {label}
          {count !== null && (
            <span
              className={`rounded-full px-2 text-xs ${
                active ? "bg-white/25" : value === "NEW" && count > 0 ? "bg-rose-dark text-white" : "bg-blush text-cocoa/70"
              }`}
            >
              {count}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div>
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-1 text-cocoa/60">{t("subtitle", { count: totalElements })}</p>
        </div>
        <button
          type="button"
          onClick={() => void list.refetch()}
          aria-label={t("refresh")}
          className="rounded-full border border-rose/25 bg-white/70 p-3 text-cocoa/70 hover:bg-blush"
        >
          <RefreshCw className={`h-5 w-5 ${list.isFetching ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </header>

      {/* ── status chips ── */}
      <nav aria-label={t("columns.status")} className="mt-6">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {chip("", t("all"), allCount)}
          {STATUSES.map((s) => chip(s, ts(s), counts.data ? counts.data[s] : null))}
        </ul>
      </nav>

      {/* ── search and filters ── */}
      <div className="mt-5 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa/40" aria-hidden />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchLabel")}
              className={`${FIELD} pl-11`}
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            className="flex items-center gap-2 rounded-xl border border-rose/30 bg-white/80 px-4 text-sm font-medium text-cocoa/80 hover:bg-blush md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {t("filters")}
          </button>
        </div>

        <div className={`grid gap-3 sm:grid-cols-3 ${filtersOpen ? "grid" : "hidden md:grid"}`}>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-cocoa/60">{t("delivery")}</span>
            <select value={method} onChange={(e) => update({ method: e.target.value })} className={FIELD}>
              <option value="">{t("allMethods")}</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`method.${m}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-cocoa/60">{t("from")}</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => update({ from: e.target.value })} className={FIELD} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-cocoa/60">{t("to")}</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => update({ to: e.target.value })} className={FIELD} />
          </label>
        </div>

        {hasFilters && (
          <button type="button" onClick={clearFilters} className="text-sm text-rose-dark underline">
            {t("clear")}
          </button>
        )}
      </div>

      {/* ── results ── */}
      <div className="mt-6" aria-live="polite">
        {list.isPending ? (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-blush/50" />
            ))}
          </div>
        ) : list.isError ? (
          <div className="rounded-3xl border border-rose/15 bg-white/70 p-8 text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button
              type="button"
              onClick={() => void list.refetch()}
              className="mt-4 rounded-full border border-rose-dark px-6 py-2 text-sm font-medium text-rose-dark hover:bg-blush"
            >
              {t("retry")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-rose/15 bg-white/70 p-12 text-center">
            <Moon className="mx-auto h-10 w-10 text-rose/60" aria-hidden />
            <p className="mt-4 font-display text-2xl">{hasFilters ? t("noMatch") : t("empty")}</p>
            {!hasFilters && <p className="mt-2 text-sm text-cocoa/60">{t("emptyHint")}</p>}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="mt-4 text-sm text-rose-dark underline">
                {t("clear")}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* computers: table */}
            <div className="hidden overflow-hidden rounded-3xl border border-rose/15 bg-white/70 shadow-sm md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-petal-100/70 text-xs uppercase tracking-wider text-cocoa/60">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-medium">{t("columns.order")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("columns.customer")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("columns.destination")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("columns.items")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("columns.total")}</th>
                    <th scope="col" className="px-5 py-3 font-medium">{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose/10">
                  {rows.map((order) => {
                    const Icon = METHOD_ICON[order.deliveryMethod];
                    return (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="cursor-pointer transition-colors hover:bg-petal-50"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            onClick={stop}
                            className="whitespace-nowrap text-lg font-semibold tabular-nums tracking-wide hover:text-petal-700"
                          >
                            {order.code}
                          </Link>
                          <p className="text-xs text-cocoa/50">{timeAgo(order.createdAt, nowMs, locale)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">{order.customerName}</p>
                          <a href={`tel:${order.phone}`} onClick={stop} className="text-cocoa/60 hover:text-rose-dark">
                            {formatPhone(order.phone)}
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-2 text-cocoa/80">
                            <Icon className="h-4 w-4 shrink-0 text-rose-dark" aria-hidden />
                            {destination(order)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-cocoa/70">{t("itemsCount", { count: order.itemCount })}</td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">{formatMoney(order.total, locale)}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusChip status={order.status} />
                            {order.status === "NEW" && <CallDueBadge createdAt={order.createdAt} nowMs={nowMs} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* phones: cards */}
            <ul className="space-y-3 md:hidden">
              {rows.map((order) => {
                const Icon = METHOD_ICON[order.deliveryMethod];
                return (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="block rounded-3xl border border-rose/15 bg-white/70 p-4 shadow-sm active:bg-blush/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-semibold tabular-nums leading-none tracking-wide">{order.code}</p>
                          <p className="mt-1 text-xs text-cocoa/50">{timeAgo(order.createdAt, nowMs, locale)}</p>
                        </div>
                        <StatusChip status={order.status} />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{order.customerName}</p>
                          <p className="text-sm text-cocoa/60">{formatPhone(order.phone)}</p>
                        </div>
                        <p className="shrink-0 font-medium">{formatMoney(order.total, locale)}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rose/10 pt-3 text-sm text-cocoa/70">
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-rose-dark" aria-hidden />
                          <span className="truncate">{destination(order)}</span>
                        </span>
                        <span>{t("itemsCount", { count: order.itemCount })}</span>
                      </div>

                      {order.status === "NEW" && (
                        <div className="mt-3">
                          <CallDueBadge createdAt={order.createdAt} nowMs={nowMs} />
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                <p className="text-cocoa/60">
                  {t("showing", { from: firstShown, to: lastShown, total: totalElements })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update({ page: page - 1 })}
                    disabled={page === 0}
                    className="flex items-center gap-1 rounded-full border border-rose/25 bg-white/70 px-4 py-2 hover:bg-blush disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    {t("previous")}
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ page: page + 1 })}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 rounded-full border border-rose/25 bg-white/70 px-4 py-2 hover:bg-blush disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("next")}
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}