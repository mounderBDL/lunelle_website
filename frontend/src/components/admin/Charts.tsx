"use client";

import { useEffect, useRef, useState } from "react";

// ───────────────────────── bar chart ─────────────────────────

export type ChartSeries = { key: string; label: string; values: number[]; barClass: string; dotClass: string };

type BarChartProps = {
  labels: string[]; // short text under each bar
  titles: string[]; // full text in the tooltip
  series: ChartSeries[]; // one series, or two for side-by-side bars
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  rowHeader: string;
  caption: string;
  integer?: boolean;
  height?: number;
};

const M = { top: 14, right: 8, bottom: 30, left: 48 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // the observer reports the size as soon as it starts watching, and again whenever it changes
    const observer = new ResizeObserver((entries) => setWidth(Math.floor(entries[0]?.contentRect.width ?? 0)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceStep(rough: number) {
  const exp = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function scale(values: number[], integer: boolean) {
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  if (max === 0 && min === 0) return { lo: 0, hi: 4, ticks: [0, 1, 2, 3, 4] };

  let step = niceStep((max - min) / 4);
  if (integer && step < 1) step = 1;
  if (integer && !Number.isInteger(step)) step *= 2;

  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}

export function BarChart({
  labels,
  titles,
  series,
  formatValue,
  formatTick,
  rowHeader,
  caption,
  integer = false,
  height = 280,
}: BarChartProps) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const n = labels.length;
  const { lo, hi, ticks } = scale(series.flatMap((s) => s.values), integer);

  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const y = (v: number) => M.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const band = n > 0 ? innerW / n : 0;
  const groupW = Math.min(band * 0.72, 56 * series.length);
  const gap = series.length > 1 ? 3 : 0;
  const barW = Math.max(1, (groupW - gap * (series.length - 1)) / series.length);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 70))));
  const current = active !== null && active < n ? active : null;

  function indexAt(event: React.PointerEvent<SVGSVGElement>) {
    if (band <= 0) return null;
    const box = event.currentTarget.getBoundingClientRect();
    const i = Math.floor((event.clientX - box.left - M.left) / band);
    return i >= 0 && i < n ? i : null;
  }

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          aria-hidden="true"
          style={{ touchAction: "pan-y" }}
          onPointerMove={(e) => setActive(indexAt(e))}
          onPointerDown={(e) => setActive(indexAt(e))}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setActive(null); // a finger keeps its last bar until the next tap
          }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={M.left}
                x2={width - M.right}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? "stroke-petal-300" : "stroke-petal-200"}
                strokeDasharray={tick === 0 ? undefined : "3 4"}
              />
              <text x={M.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-cocoa/60 text-[11px]">
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {current !== null && (
            <rect x={M.left + band * current} y={M.top} width={band} height={innerH} className="fill-petal-100/70" />
          )}

          {series.map((s, si) =>
            s.values.map((v, i) => {
              if (v === 0) return null;
              const x = M.left + band * i + (band - groupW) / 2 + si * (barW + gap);
              return (
                <rect
                  key={`${s.key}-${i}`}
                  x={x}
                  y={Math.min(y(v), y(0))}
                  width={barW}
                  height={Math.max(2, Math.abs(y(v) - y(0)))}
                  rx={Math.min(4, barW / 2)}
                  className={s.barClass}
                />
              );
            }),
          )}

          {labels.map((label, i) =>
            i % labelEvery === 0 ? (
              <text
                key={i}
                x={M.left + band * (i + 0.5)}
                y={height - 9}
                textAnchor="middle"
                className="fill-cocoa/60 text-[11px]"
              >
                {label}
              </text>
            ) : null,
          )}
        </svg>
      )}

      {current !== null && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-56 rounded-xl border border-petal-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(Math.max(M.left + band * (current + 0.5), 96), Math.max(96, width - 96)),
            top: M.top,
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-semibold">{titles[current]}</p>
          {series.map((s) => (
            <p key={s.key} className="mt-1 flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.dotClass}`} aria-hidden />
              <span className="text-cocoa/70">{s.label}</span>
              <span className="ml-auto pl-3 font-semibold tabular-nums">{formatValue(s.values[current])}</span>
            </p>
          ))}
        </div>
      )}

      {/* the same numbers as a table, for screen readers */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{rowHeader}</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {titles.map((title, i) => (
            <tr key={i}>
              <th scope="row">{title}</th>
              {series.map((s) => (
                <td key={s.key}>{formatValue(s.values[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────── ranked list with bars ─────────────────────────

export type BarRow = { key: string; label: string; value: number; display: string; sub?: string };

export function BarList({
  rows,
  barClass = "bg-petal-400",
  numbered = false,
}: {
  rows: BarRow[];
  barClass?: string;
  numbered?: boolean;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-4">
      {rows.map((row, i) => {
        const pct = max > 0 && row.value > 0 ? Math.max(3, (row.value / max) * 100) : 0;
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold">
                {numbered && <span className="mr-2 tabular-nums text-cocoa/40">{i + 1}</span>}
                {row.label}
              </p>
              <p className="shrink-0 text-sm font-bold tabular-nums">{row.display}</p>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-petal-100" aria-hidden>
              <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
            </div>
            {row.sub && <p className="mt-1 text-xs tabular-nums text-cocoa/60">{row.sub}</p>}
          </li>
        );
      })}
    </ol>
  );
}

// ───────────────────────── one bar split in colored parts ─────────────────────────

export type Segment = { key: string; label: string; value: number; barClass: string };

export function StackedBar({ segments }: { segments: Segment[] }) {
  return (
    <div
      role="img"
      aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
      className="flex h-5 w-full overflow-hidden rounded-full bg-petal-100"
    >
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${s.value}`}
            className={`h-full ${s.barClass}`}
            style={{ flexGrow: s.value, flexBasis: 0 }}
          />
        ))}
    </div>
  );
}