import { Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatSpan } from "@/lib/admin/format";

const PROMISE_MINUTES = 24 * 60; // "We'll call you within 24 hours"

export default function CallDueBadge({ createdAt, nowMs }: { createdAt: string; nowMs: number }) {
  const t = useTranslations("admin.orders");
  const locale = useLocale();
  if (nowMs === 0) return null;

  const remaining = Math.round(PROMISE_MINUTES - (nowMs - new Date(createdAt).getTime()) / 60_000);
  const overdue = remaining < 0;
  const time = formatSpan(Math.abs(remaining), locale);
  const tone = overdue
    ? "bg-red-50 text-red-700"
    : remaining < 4 * 60
      ? "bg-amber-soft text-amber-dark"
      : "bg-parchment/70 text-cocoa/70";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      <Phone className="h-3 w-3" aria-hidden />
      {overdue ? t("overdue", { time }) : t("dueIn", { time })}
    </span>
  );
}