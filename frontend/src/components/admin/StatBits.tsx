import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

export const TONES = {
  revenue: { card: "from-petal-100", tile: "bg-petal-200 text-petal-700" },
  profit: { card: "from-petal-200/70", tile: "bg-petal-300/80 text-petal-700" },
  delivered: { card: "from-petal-100/70", tile: "bg-petal-100 text-petal-600" },
  average: { card: "from-petal-50", tile: "bg-petal-200/80 text-petal-600" },
} as const;

/** Change in percent between two periods, or null when there is nothing to compare with. */
export function change(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

export function Trend({ value, label }: { value: number | null; label: string }) {
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

export function Kpi({
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

/** A small group of exclusive choices (for example Day | Week | Month). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-petal-200 bg-white/70 p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          disabled={option.disabled}
          aria-pressed={option.key === value}
          onClick={() => onChange(option.key)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            option.key === value ? "bg-petal-700 text-white" : "text-cocoa/70 hover:bg-petal-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}