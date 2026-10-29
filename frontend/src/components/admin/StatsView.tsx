"use client";

import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { PackageCheck, Receipt, Sparkles, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import {
  PERIODS,
  autoGranularity,
  daysInRange,
  formatRange,
  granularityAllowed,
  longDay,
  monthLong,
  monthShort,
  presetRange,
  rangeProblem,
  resolveRange,
  shortDay,
  type Granularity,
  type PeriodKey,
} from "@/lib/admin/period";
import type { Breakdowns, ProductStat, StatsOverviewFull, Timeseries } from "@/lib/admin/statsTypes";
import type { LowStockItem } from "@/lib/admin/types";
import type { OrderStatus } from "@/lib/api/types";
import { formatMoney, localized } from "@/lib/format";
import Card from "./Card";
import { BarChart, BarList, StackedBar, type BarRow, type ChartSeries } from "./Charts";
import { INPUT } from "./FormBits";
import { Kpi, Segmented, Trend, change } from "./StatBits";

type Metric = "revenue" | "profit" | "orders";
type Sort = "units" | "revenue" | "profit";

const STATUS_ORDER: OrderStatus[] = ["NEW", "CONFIRMED", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED", "NO_ANSWER"];
const STATUS_BAR: Record<OrderStatus, string> = {
  NEW: "bg-petal-400",
  CONFIRMED: "bg-gold",
  SHIPPED: "bg-lavender-dark/70",
  DELIVERED: "bg-sage",
  RETURNED: "bg-terracotta-dark",
  CANCELLED: "bg-stone-dark/50",
  NO_ANSWER: "bg-terracotta-dark/45",
};

const share = (value: number, total: number) => (total > 0 ? Math.round((value * 100) / total) : 0);

/** Shows the section once its data is there; a skeleton while loading; a retry if it failed. */
function Slot<T>({
  query,
  height,
  children,
}: {
  query: UseQueryResult<T, Error>;
  height: string;
  children: (data: T) => React.ReactNode;
}) {
  const t = useTranslations("admin.stats");
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.isError) {
    return (
      <Card>
        <p className="text-sm text-cocoa/70">
          {t("loadError")}{" "}
          <button type="button" onClick={() => void query.refetch()} className="underline">
            {t("retry")}
          </button>
        </p>
      </Card>
    );
  }
  return <div className={`animate-pulse rounded-3xl bg-petal-100/70 ${height}`} aria-hidden />;
}

// ───────────────────────── page ─────────────────────────

export default function StatsView() {
  const t = useTranslations("admin.stats");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  // ── the period lives in the address, so the back button and shared links keep it ──
  const periodParam = search.get("period");
  const period: PeriodKey = PERIODS.includes(periodParam as PeriodKey) ? (periodParam as PeriodKey) : "30";
  const range = resolveRange(period, search.get("from"), search.get("to"));
  const problem = period === "custom" ? rangeProblem(range) : null;
  const ready = range !== null && problem === null;
  const from = range?.from ?? "";
  const to = range?.to ?? "";
  const days = range ? daysInRange(range) : 30;

  const [granPick, setGranPick] = useState<Granularity | null>(null);
  const gran: Granularity = granPick && granularityAllowed(granPick, days) ? granPick : autoGranularity(days);
  const [metric, setMetric] = useState<Metric>("revenue");
  const [sort, setSort] = useState<Sort>("units");

  function go(params: URLSearchParams) {
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function choose(key: PeriodKey) {
    const params = new URLSearchParams();
    if (key !== "30") params.set("period", key);
    if (key === "custom") {
      const base = range ?? presetRange("30");
      params.set("from", base.from);
      params.set("to", base.to);
    }
    go(params);
  }

  function setCustom(patch: { from?: string; to?: string }) {
    const params = new URLSearchParams(search.toString());
    params.set("period", "custom");
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    go(params);
  }

  // ── data ──
  const overview = useQuery({
    queryKey: ["stats", "overview", from, to],
    queryFn: () => adminFetch<StatsOverviewFull>(`/api/admin/stats/overview?from=${from}&to=${to}`),
    enabled: ready,
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  });
  const series = useQuery({
    queryKey: ["stats", "timeseries", from, to, gran],
    queryFn: () => adminFetch<Timeseries>(`/api/admin/stats/timeseries?from=${from}&to=${to}&granularity=${gran}`),
    enabled: ready,
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  });
  const breakdowns = useQuery({
    queryKey: ["stats", "breakdowns", from, to, sort],
    queryFn: () => adminFetch<Breakdowns>(`/api/admin/stats/breakdowns?from=${from}&to=${to}&limit=8&sort=${sort}`),
    enabled: ready,
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  });
  const lowStock = useQuery({
    queryKey: ["stats", "low-stock"],
    queryFn: () => adminFetch<LowStockItem[]>("/api/admin/stats/low-stock?threshold=3"),
    refetchInterval: 120_000,
  });

  const refreshing = overview.isPlaceholderData || series.isPlaceholderData || breakdowns.isPlaceholderData;

  return (
    <div>
      <header>
        <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-1 text-cocoa/60">{t("subtitle")}</p>
      </header>

      {/* ── period ── */}
      <div className="mt-6">
        <div
          role="group"
          aria-label={t("period")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => choose(key)}
              aria-pressed={period === key}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                period === key
                  ? "bg-petal-700 text-white"
                  : "border border-petal-200 bg-white/70 text-cocoa/80 hover:bg-petal-100"
              }`}
            >
              {t(`periods.${key}`)}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-3 grid max-w-md gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cocoa/60">{t("from")}</span>
              <input
                type="date"
                value={search.get("from") ?? ""}
                max={search.get("to") ?? undefined}
                onChange={(e) => setCustom({ from: e.target.value })}
                className={`${INPUT} border-petal-300/70`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cocoa/60">{t("to")}</span>
              <input
                type="date"
                value={search.get("to") ?? ""}
                min={search.get("from") ?? undefined}
                onChange={(e) => setCustom({ to: e.target.value })}
                className={`${INPUT} border-petal-300/70`}
              />
            </label>
          </div>
        )}

        {problem && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {t(`problems.${problem}`)}
          </p>
        )}

        {ready && overview.data && (
          <p className="mt-3 text-sm text-cocoa/70">
            <span className="font-semibold text-cocoa">{formatRange(overview.data.from, overview.data.to, locale)}</span>
            {" · "}
            {t("compared", { range: formatRange(overview.data.previousFrom, overview.data.previousTo, locale) })}
          </p>
        )}
      </div>

      <p className="mt-4 rounded-2xl bg-petal-50 px-4 py-3 text-sm text-cocoa/75">{t("note")}</p>

      {ready && (
        <div className={`mt-6 space-y-6 transition-opacity ${refreshing ? "opacity-70" : ""}`}>
          <Slot query={overview} height="h-40">
            {(data) => <KpiSection data={data} />}
          </Slot>

          <TrendCard query={series} gran={gran} days={days} onGran={setGranPick} metric={metric} onMetric={setMetric} />

          <Slot query={overview} height="h-52">
            {(data) => <FunnelCard data={data} />}
          </Slot>

          <div className="grid gap-6 lg:grid-cols-2">
            <Slot query={breakdowns} height="h-96">
              {(data) => <BestSellersCard data={data} sort={sort} onSort={setSort} />}
            </Slot>
            <div className="space-y-6">
              <Slot query={breakdowns} height="h-52">
                {(data) => <CategoriesCard data={data} />}
              </Slot>
              <Slot query={breakdowns} height="h-52">
                {(data) => <DeliveryCard data={data} fees={overview.data?.current.deliveryFees ?? 0} />}
              </Slot>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Slot query={breakdowns} height="h-72">
              {(data) => <WilayasCard data={data} />}
            </Slot>
            <Slot query={lowStock} height="h-40">
              {(data) => <LowStockCard items={data} />}
            </Slot>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── numbers ─────────────────────────

function KpiSection({ data }: { data: StatsOverviewFull }) {
  const t = useTranslations("admin.stats");
  const locale = useLocale();
  const cur = data.current;
  const prev = data.previous;

  const trend = (a: number, b: number) => {
    const value = change(a, b);
    return <Trend value={value} label={value === null ? t("kpi.noComparison") : t("kpi.vs")} />;
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t("kpi.revenue")} value={formatMoney(cur.revenue, locale)} icon={Wallet} tone="revenue">
          {trend(cur.revenue, prev.revenue)}
        </Kpi>
        <Kpi label={t("kpi.profit")} value={formatMoney(cur.profit, locale)} icon={Sparkles} tone="profit">
          <p className="text-cocoa/60">{t("kpi.profitHint", { percent: cur.marginPercent })}</p>
          <div className="mt-1">{trend(cur.profit, prev.profit)}</div>
        </Kpi>
        <Kpi label={t("kpi.delivered")} value={String(cur.deliveredOrders)} icon={PackageCheck} tone="delivered">
          {trend(cur.deliveredOrders, prev.deliveredOrders)}
        </Kpi>
        <Kpi label={t("kpi.average")} value={formatMoney(cur.averageOrderValue, locale)} icon={Receipt} tone="average">
          {trend(cur.averageOrderValue, prev.averageOrderValue)}
        </Kpi>
      </div>

      {cur.uncostedRevenue > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-soft px-4 py-3 text-sm text-amber-dark">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            {t("uncosted", { amount: formatMoney(cur.uncostedRevenue, locale) })}{" "}
            <Link href="/admin/products" className="font-semibold underline">
              {t("uncostedAction")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── sales over time ─────────────────────────

function TrendCard({
  query,
  gran,
  days,
  onGran,
  metric,
  onMetric,
}: {
  query: UseQueryResult<Timeseries, Error>;
  gran: Granularity;
  days: number;
  onGran: (value: Granularity) => void;
  metric: Metric;
  onMetric: (value: Metric) => void;
}) {
  const t = useTranslations("admin.stats.chart");
  const ts = useTranslations("admin.stats");
  const locale = useLocale();

  const points = query.data?.points ?? [];
  const shown: Granularity = query.data?.granularity ?? gran;
  const money = (v: number) => formatMoney(v, locale);
  const compact = (v: number) =>
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  const labels = points.map((p) => (shown === "month" ? monthShort(p.date, locale) : shortDay(p.date, locale)));
  const titles = points.map((p) =>
    shown === "day"
      ? longDay(p.date, locale)
      : shown === "week"
        ? t("weekOf", { date: shortDay(p.date, locale) })
        : monthLong(p.date, locale),
  );

  let chartSeries: ChartSeries[];
  if (metric === "orders") {
    chartSeries = [
      { key: "received", label: t("received"), values: points.map((p) => p.createdOrders), barClass: "fill-petal-300", dotClass: "bg-petal-300" },
      { key: "delivered", label: t("delivered"), values: points.map((p) => p.deliveredOrders), barClass: "fill-petal-700", dotClass: "bg-petal-700" },
    ];
  } else if (metric === "profit") {
    chartSeries = [
      { key: "profit", label: t("metrics.profit"), values: points.map((p) => p.profit), barClass: "fill-sage", dotClass: "bg-sage" },
    ];
  } else {
    chartSeries = [
      { key: "revenue", label: t("metrics.revenue"), values: points.map((p) => p.revenue), barClass: "fill-petal-500", dotClass: "bg-petal-500" },
    ];
  }

  const empty = chartSeries.every((s) => s.values.every((v) => v === 0));
  const main = chartSeries[0].values;
  const total = main.reduce((a, b) => a + b, 0);
  const bestValue = Math.max(0, ...main);
  const bestIndex = main.indexOf(bestValue);
  const bestKey = shown === "day" ? "bestDay" : shown === "week" ? "bestWeek" : "bestMonth";

  return (
    <Card title={t("title")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={t("show")}
          value={metric}
          onChange={onMetric}
          options={[
            { key: "revenue", label: t("metrics.revenue") },
            { key: "profit", label: t("metrics.profit") },
            { key: "orders", label: t("metrics.orders") },
          ]}
        />
        <Segmented
          label={t("groupBy")}
          value={shown}
          onChange={onGran}
          options={[
            { key: "day", label: t("granularities.day"), disabled: !granularityAllowed("day", days) },
            { key: "week", label: t("granularities.week") },
            { key: "month", label: t("granularities.month") },
          ]}
        />
      </div>

      <div className="mt-5">
        {query.data === undefined ? (
          query.isError ? (
            <p className="text-sm text-cocoa/70">
              {ts("loadError")}{" "}
              <button type="button" onClick={() => void query.refetch()} className="underline">
                {ts("retry")}
              </button>
            </p>
          ) : (
            <div className="h-72 animate-pulse rounded-2xl bg-petal-100/70" aria-hidden />
          )
        ) : empty ? (
          <p className="rounded-2xl bg-petal-50 px-5 py-12 text-center text-cocoa/70">
            {metric === "orders" ? t("emptyOrders") : t("empty")}
          </p>
        ) : (
          <>
            <BarChart
              labels={labels}
              titles={titles}
              series={chartSeries}
              formatValue={metric === "orders" ? (v) => String(v) : money}
              formatTick={compact}
              integer={metric === "orders"}
              rowHeader={t("rowHeader")}
              caption={t("caption")}
            />

            {metric === "orders" && (
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {chartSeries.map((s) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dotClass}`} aria-hidden />
                    {s.label}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-petal-200 pt-4 text-sm tabular-nums">
              {metric === "orders" ? (
                <p className="font-semibold">
                  {t("totalOrders", {
                    received: chartSeries[0].values.reduce((a, b) => a + b, 0),
                    delivered: chartSeries[1].values.reduce((a, b) => a + b, 0),
                  })}
                </p>
              ) : (
                <>
                  <p className="font-semibold">{t("total", { value: money(total) })}</p>
                  {bestValue > 0 && <p className="text-cocoa/70">{t(bestKey, { title: titles[bestIndex], value: money(bestValue) })}</p>}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ───────────────────────── order journey ─────────────────────────

function FunnelCard({ data }: { data: StatsOverviewFull }) {
  const t = useTranslations("admin.stats.funnel");
  const ts = useTranslations("admin.status");
  const locale = useLocale();
  const f = data.funnel;
  const count = (s: OrderStatus) => f.byStatus[s] ?? 0;

  const confirmedOrBeyond = count("CONFIRMED") + count("SHIPPED") + count("DELIVERED") + count("RETURNED");
  const sent = count("DELIVERED") + count("RETURNED");
  const rate = (n: number) =>
    `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 }).format(n)}%`;

  const rates = [
    { key: "confirmation", value: f.confirmationRate, part: confirmedOrBeyond, whole: f.created },
    { key: "cancellation", value: f.cancellationRate, part: count("CANCELLED"), whole: f.created },
    { key: "return", value: f.returnRate, part: count("RETURNED"), whole: sent },
  ] as const;

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>

      {f.created === 0 ? (
        <p className="mt-5 rounded-2xl bg-petal-50 px-5 py-8 text-center text-cocoa/70">{t("empty")}</p>
      ) : (
        <>
          <p className="mt-5 text-sm font-semibold tabular-nums">{t("received", { count: f.created })}</p>
          <div className="mt-2">
            <StackedBar
              segments={STATUS_ORDER.map((s) => ({ key: s, label: ts(s), value: count(s), barClass: STATUS_BAR[s] }))}
            />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {STATUS_ORDER.filter((s) => count(s) > 0).map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[s]}`} aria-hidden />
                <span className="text-cocoa/75">{ts(s)}</span>
                <span className="font-semibold tabular-nums">{count(s)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {rates.map((r) => (
              <div key={r.key} className="rounded-2xl bg-petal-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-cocoa/60">{t(`rates.${r.key}.title`)}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{r.whole > 0 ? rate(r.value) : "—"}</p>
                <p className="mt-1 text-xs text-cocoa/60">
                  {r.whole > 0 ? t(`rates.${r.key}.detail`, { count: r.part, total: r.whole }) : t("noData")}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

// ───────────────────────── best sellers ─────────────────────────

function BestSellersCard({ data, sort, onSort }: { data: Breakdowns; sort: Sort; onSort: (value: Sort) => void }) {
  const t = useTranslations("admin.stats.best");
  const locale = useLocale();
  const money = (v: number) => formatMoney(v, locale);

  const rows = (items: ProductStat[]): BarRow[] =>
    items.map((p, i) => {
      const values = { units: p.units, revenue: p.revenue, profit: p.profit };
      return {
        key: `${i}-${p.name.en ?? p.name.fr}`,
        label: localized(p.name, locale),
        value: values[sort],
        display: sort === "units" ? t("sold", { count: p.units }) : money(values[sort]),
        sub: t(`sub.${sort}`, { units: p.units, revenue: money(p.revenue), profit: money(p.profit) }),
      };
    });

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      <div className="mt-4">
        <Segmented
          label={t("sort")}
          value={sort}
          onChange={onSort}
          options={[
            { key: "units", label: t("sorts.units") },
            { key: "revenue", label: t("sorts.revenue") },
            { key: "profit", label: t("sorts.profit") },
          ]}
        />
      </div>

      <h3 className="mt-6 text-xl">{t("products")}</h3>
      <div className="mt-3">
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-cocoa/60">{t("empty")}</p>
        ) : (
          <BarList rows={rows(data.topProducts)} numbered />
        )}
      </div>

      <h3 className="mt-8 text-xl">{t("packs")}</h3>
      <div className="mt-3">
        {data.topPacks.length === 0 ? (
          <p className="text-sm text-cocoa/60">{t("empty")}</p>
        ) : (
          <BarList rows={rows(data.topPacks)} numbered barClass="bg-gold" />
        )}
      </div>
    </Card>
  );
}

// ───────────────────────── categories, delivery types, wilayas ─────────────────────────

function CategoriesCard({ data }: { data: Breakdowns }) {
  const t = useTranslations("admin.stats.categories");
  const locale = useLocale();
  const total = data.categories.reduce((sum, c) => sum + c.revenue, 0);

  const rows: BarRow[] = data.categories.map((c, i) => ({
    key: `${i}-${c.name.en}`,
    label: localized(c.name, locale),
    value: c.revenue,
    display: formatMoney(c.revenue, locale),
    sub: t("sub", { share: share(c.revenue, total), units: c.units, profit: formatMoney(c.profit, locale) }),
  }));

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      <div className="mt-4">
        {rows.length === 0 ? <p className="text-sm text-cocoa/60">{t("empty")}</p> : <BarList rows={rows} />}
      </div>
    </Card>
  );
}

function DeliveryCard({ data, fees }: { data: Breakdowns; fees: number }) {
  const t = useTranslations("admin.stats.delivery");
  const tm = useTranslations("admin.orders.method");
  const locale = useLocale();
  const total = data.deliveryTypes.reduce((sum, d) => sum + d.revenue, 0);
  const anySales = data.deliveryTypes.some((d) => d.orders > 0);

  const rows: BarRow[] = data.deliveryTypes.map((d) => ({
    key: d.method,
    label: tm(d.method),
    value: d.revenue,
    display: formatMoney(d.revenue, locale),
    sub:
      d.method === "HAND_TO_HAND"
        ? t("sub", { orders: d.orders, share: share(d.revenue, total) })
        : t("subFees", {
            orders: d.orders,
            share: share(d.revenue, total),
            fees: formatMoney(d.deliveryFees, locale),
          }),
  }));

  return (
    <Card title={t("title")}>
      <div className="mt-1">
        {anySales ? <BarList rows={rows} barClass="bg-petal-500" /> : <p className="text-sm text-cocoa/60">{t("empty")}</p>}
      </div>
      <p className="mt-5 border-t border-petal-200 pt-4 text-xs text-cocoa/60">
        {t("feesNote", { amount: formatMoney(fees, locale) })}
      </p>
    </Card>
  );
}

function WilayasCard({ data }: { data: Breakdowns }) {
  const t = useTranslations("admin.stats.wilayas");
  const locale = useLocale();

  const rows: BarRow[] = data.wilayas.slice(0, 10).map((w) => ({
    key: w.wilaya,
    label: w.wilaya,
    value: w.orders,
    display: t("orders", { count: w.orders }),
    sub: t("sub", { revenue: formatMoney(w.revenue, locale) }),
  }));

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>
      <div className="mt-4">
        {rows.length === 0 ? <p className="text-sm text-cocoa/60">{t("empty")}</p> : <BarList rows={rows} barClass="bg-petal-300" numbered />}
      </div>
    </Card>
  );
}

// ───────────────────────── low stock ─────────────────────────

function LowStockCard({ items }: { items: LowStockItem[] }) {
  const t = useTranslations("admin.stats.lowStock");
  const locale = useLocale();

  return (
    <Card title={t("title")}>
      {items.length === 0 ? (
        <p className="text-sm text-cocoa/70">{t("empty")}</p>
      ) : (
        <ul className="space-y-1">
          {items.slice(0, 8).map((item) => (
            <li key={item.variantId}>
              <Link
                href={`/admin/products/${item.productId}`}
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-petal-50"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{localized(item.productName, locale)}</span>{" "}
                  <span className="text-cocoa/60">{item.variantLabel}</span>
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    item.outOfStock ? "bg-terracotta-soft text-terracotta-dark" : "bg-amber-soft text-amber-dark"
                  }`}
                >
                  {item.outOfStock ? t("outOfStock") : t("left", { count: item.stock })}
                </span>
              </Link>
            </li>
          ))}
          {items.length > 8 && <li className="px-2 pt-1 text-xs text-cocoa/50">{t("more", { count: items.length - 8 })}</li>}
        </ul>
      )}
    </Card>
  );
}