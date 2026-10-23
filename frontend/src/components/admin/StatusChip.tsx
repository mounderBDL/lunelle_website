import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/lib/api/types";

const STYLES: Record<OrderStatus, string> = {
  NEW: "bg-blush text-rose-dark",
  CONFIRMED: "bg-amber-soft text-amber-dark",
  SHIPPED: "bg-lavender text-lavender-dark",
  DELIVERED: "bg-sage-soft text-sage-dark",
  CANCELLED: "bg-stone-soft text-stone-dark",
  NO_ANSWER: "bg-terracotta-soft text-terracotta-dark",
  RETURNED: "bg-terracotta-soft text-terracotta-dark",
};

export default function StatusChip({ status }: { status: OrderStatus }) {
  const t = useTranslations("admin.status");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STYLES[status]}`}
    >
      {status === "NEW" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-dark" aria-hidden />}
      {t(status)}
    </span>
  );
}