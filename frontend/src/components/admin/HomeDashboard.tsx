"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  PackageCheck,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import { algiersDate, formatPhone, hourInAlgiers } from "@/lib/admin/format";
import { useOrderCounts } from "@/lib/admin/hooks";
import type { LowStockItem, OrderListItem, Page, StatsOverview } from "@/lib/admin/types";
import { useNow } from "@/lib/admin/useNow";
import { formatMoney, localized } from "@/lib/format";
import { useAdminAuth } from "./AdminProviders";
import CallDueBadge from "./CallDueBadge";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];
const DAY_MS = 86_400_000;

const TONES = {
  revenue: { card: "from-petal-100", tile: "bg-petal-200 text-petal-700" },
  profit: { card: "from-petal-200/70", tile: "bg-petal-300/80 text-petal-700" },
  delivered: { card: "from-petal-100/70", tile: "bg-petal-100 text-petal-600" },
  average: { card: "from-petal-50", tile: "bg-petal-200/80 text-petal-600" },
} as const;

function change(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-petal-200/70 bg-white/75 p-5 shadow-sm sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function Trend({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return <span className="text-cocoa/50">{label}</span>;
  }
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          up ? "bg-sage-soft text-sage-dark" : "bg-terracotta-soft text-terracotta-dark"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {up ? "+" : ""}
        {value}%
      </span>
      <span className="text-cocoa/50">{label}</span>
    </span>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  children?: React.ReactNode;
}) {
  const style = TONES[tone];
  return (
    <div
      className={`rounded-3xl border border-petal-200/70 bg-linear-to-br ${style.card} to-white/80 p-5 shadow-sm sm:p-6`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-cocoa/60">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.tile}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight sm:text-[2rem]">{value}</p>
      {children && <div className="mt-2 text-sm">{children}</div>}
    </div>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("admin.home");
  return (
    <p className="text-sm text-cocoa/70">
      {t("loadError")}{" "}
      <button type="button" onClick={onRetry} className="underline">
        {t("retry")}
      </button>
    </p>
  );
}

export default function HomeDashboard() {
  const t = useTranslations("admin.home");
  const locale = useLocale();
  const auth = useAdminAuth();
  const nowMs = useNow();
  const counts = useOrderCounts();
  const [days, setDays] = useState<Period>(30);
  // team members only see "Needs a call" and "Running low" (the server refuses the rest anyway)
  const isOwner = auth.status === "authed" && auth.admin.role === "OWNER";

  const overview = useQuery({
    queryKey: ["stats", "overview", days],
    queryFn: () =>
      adminFetch<StatsOverview>(
        `/api/admin/stats/overview?from=${algiersDate(-(days - 1))}&to=${algiersDate()}`,
      ),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
    enabled: isOwner,
  });

  const needsCall = useQuery({
    queryKey: ["orders", "needs-call"],
    queryFn: () => adminFetch<Page<OrderListItem>>("/api/admin/orders?status=NEW&size=50"),
    refetchInterval: 60_000,
  });

  const lowStock = useQuery({
    queryKey: ["stats", "low-stock"],
    queryFn: () => adminFetch<LowStockItem[]>("/api/admin/stats/low-stock?threshold=3"),
    refetchInterval: 120_000,
  });

  const name = auth.status === "authed" ? auth.admin.name : "";
  const hour = nowMs === 0 ? null : hourInAlgiers(nowMs);
  const greeting =
    hour === null
      ? t("greeting.welcome")
      : hour < 12
        ? t("greeting.morning")
        : hour < 18
          ? t("greeting.afternoon")
          : t("greeting.evening");
  const dateLine =
    nowMs === 0
      ? ""
      : new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "Africa/Algiers",
        }).format(new Date(nowMs));

  const cur = overview.data?.current;
  const prev = overview.data?.previous;
  const waiting = needsCall.data
    ? [...needsCall.data.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];
  const overdue = nowMs === 0 ? 0 : waiting.filter((o) => nowMs - new Date(o.createdAt).getTime() > DAY_MS).length;
  const newTotal = counts.data?.NEW ?? waiting.length;
  const low = lowStock.data ?? [];

  return (
    <div className="space-y-8">
      {/* ── greeting ── */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-petal-200 via-petal-100 to-cream p-6 sm:p-10">
        <Image
          src="/brand/logo.png"
          alt=""
          width={300}
          height={110}
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-3 hidden w-64 opacity-25 mix-blend-multiply sm:block"
        />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-petal-700">{dateLine}</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="mt-2 max-w-md text-cocoa/75">{t("subtitle")}</p>
      </section>

      <div className={isOwner ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" : "grid gap-8 lg:grid-cols-2"}>
        {/* ── attention (first on phones) ── */}
        <div className={isOwner ? "order-first space-y-6 lg:order-last" : "space-y-6 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0"}>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl">{t("needsCall")}</h2>
              {newTotal > 0 && (
                <span className="rounded-full bg-petal-700 px-2.5 py-0.5 text-sm font-semibold tabular-nums text-white">
                  {newTotal}
                </span>
              )}
            </div>

            {overdue > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                {t("overdueCount", { count: overdue })}
              </p>
            )}

            <div className="mt-4">
              {needsCall.isPending ? (
                <div className="space-y-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-petal-100/70" />
                  ))}
                </div>
              ) : needsCall.isError ? (
                <SectionError onRetry={() => void needsCall.refetch()} />
              ) : waiting.length === 0 ? (
                <p className="text-sm text-cocoa/70">{t("needsCallEmpty")}</p>
              ) : (
                <ul className="-mx-2 space-y-1">
                  {waiting.slice(0, 5).map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="block rounded-2xl p-2 transition-colors hover:bg-petal-50"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-semibold tabular-nums tracking-wide">{order.code}</span>
                          <CallDueBadge createdAt={order.createdAt} nowMs={nowMs} />
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-cocoa/70">
                          {order.customerName} · {formatPhone(order.phone)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {waiting.length > 0 && (
              <Link
                href="/admin/orders?status=NEW"
                className="mt-3 inline-block text-sm font-semibold text-petal-700 underline"
              >
                {t("viewAll")}
              </Link>
            )}
          </Card>

          <Card>
            <h2 className="text-2xl">{t("lowStock")}</h2>
            <div className="mt-4">
              {lowStock.isPending ? (
                <div className="h-14 animate-pulse rounded-2xl bg-petal-100/70" aria-hidden />
              ) : lowStock.isError ? (
                <SectionError onRetry={() => void lowStock.refetch()} />
              ) : low.length === 0 ? (
                <p className="text-sm text-cocoa/70">{t("lowStockEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {low.slice(0, 5).map((item) => (
                    <li key={item.variantId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold">{localized(item.productName, locale)}</span>{" "}
                        <span className="text-cocoa/60">{item.variantLabel}</span>
                      </span>
                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.outOfStock
                            ? "bg-terracotta-soft text-terracotta-dark"
                            : "bg-amber-soft text-amber-dark"
                        }`}
                      >
                        {item.outOfStock ? t("outOfStock") : t("left", { count: item.stock })}
                      </span>
                    </li>
                  ))}
                  {low.length > 5 && <li className="text-xs text-cocoa/50">{t("more", { count: low.length - 5 })}</li>}
                </ul>
              )}
            </div>
          </Card>
        </div>

        {/* ── numbers (owner only) ── */}
        {isOwner && (
        <div className="space-y-6">
          <div role="group" aria-label={t("period")} className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                aria-pressed={p === days}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  p === days
                    ? "bg-petal-700 text-white"
                    : "border border-petal-300/70 bg-white/70 text-cocoa/70 hover:bg-petal-100"
                }`}
              >
                {t("days", { days: p })}
              </button>
            ))}
          </div>

          {overview.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-3xl bg-petal-100/70" />
              ))}
            </div>
          ) : overview.isError || !cur || !prev ? (
            <Card>
              <SectionError onRetry={() => void overview.refetch()} />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat label={t("revenue")} value={formatMoney(cur.revenue, locale)} icon={Wallet} tone="revenue">
                  <Trend
                    value={change(cur.revenue, prev.revenue)}
                    label={change(cur.revenue, prev.revenue) === null ? t("noComparison") : t("vsPrevious", { days })}
                  />
                </Stat>
                <Stat label={t("profit")} value={formatMoney(cur.profit, locale)} icon={Sparkles} tone="profit">
                  <p className="text-cocoa/60">{t("profitHint", { percent: cur.marginPercent })}</p>
                </Stat>
                <Stat label={t("delivered")} value={String(cur.deliveredOrders)} icon={PackageCheck} tone="delivered">
                  <Trend
                    value={change(cur.deliveredOrders, prev.deliveredOrders)}
                    label={
                      change(cur.deliveredOrders, prev.deliveredOrders) === null
                        ? t("noComparison")
                        : t("vsPrevious", { days })
                    }
                  />
                </Stat>
                <Stat label={t("average")} value={formatMoney(cur.averageOrderValue, locale)} icon={Receipt} tone="average" />
              </div>

              {cur.uncostedRevenue > 0 && (
                <p className="flex items-start gap-2 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-dark">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {t("uncosted", { amount: formatMoney(cur.uncostedRevenue, locale) })}
                </p>
              )}

              <Card>
                <h2 className="text-2xl">{t("pipeline")}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["confirmed", overview.data.pipeline.confirmed, "bg-amber-soft text-amber-dark"],
                      ["shipped", overview.data.pipeline.shipped, "bg-lavender text-lavender-dark"],
                    ] as const
                  ).map(([key, entry, tone]) => (
                    <div key={key} className="rounded-2xl bg-petal-50 p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{t(key)}</span>
                      <p className="mt-3 text-2xl font-bold tabular-nums">{formatMoney(entry.amount, locale)}</p>
                      <p className="text-sm text-cocoa/60">{t("ordersCount", { count: entry.orders })}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}