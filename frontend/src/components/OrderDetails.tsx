import { useLocale, useTranslations } from "next-intl";
import type { OrderSummary } from "@/lib/api/types";
import { formatDateTime, formatMoney, localized } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
      <dt className="text-cocoa/60">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default function OrderDetails({ order }: { order: OrderSummary }) {
  const t = useTranslations("order");
  const locale = useLocale();
  const hand = order.deliveryMethod === "HAND_TO_HAND";
  const destination = [order.communeName, order.wilayaName].filter(Boolean).join(", ");

  return (
    <section className="rounded-2xl border border-rose/20 bg-white/50 p-6 sm:p-8">
      <h2 className="text-3xl">{t("summary")}</h2>

      <ul className="mt-5 divide-y divide-rose/15">
        {order.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="font-display text-xl leading-tight">
                {item.quantity} ×{" "}
                <span className="font-script text-2xl font-normal">{localized(item.name, locale)}</span>
              </p>
              {item.type === "VARIANT" && item.variantLabel && (
                <p className="text-sm text-cocoa/70">{item.variantLabel}</p>
              )}
              {item.type === "PACK" && item.components.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-cocoa/70">
                  {item.components.map((c, j) => (
                    <li key={j}>
                      {c.quantity} × {localized(c.name, locale)} ({c.variantLabel})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="shrink-0 text-right">{formatMoney(item.lineTotal, locale)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-rose/20 pt-4 text-sm">
        <Row label={t("subtotal")}>{formatMoney(order.subtotal, locale)}</Row>
        <Row label={t("deliveryFee")}>
          {order.deliveryFee === 0 ? t("free") : formatMoney(order.deliveryFee, locale)}
        </Row>
        <div className="flex justify-between border-t border-rose/20 pt-3">
          <dt className="font-display text-2xl">{t("total")}</dt>
          <dd className="text-xl font-medium">{formatMoney(order.total, locale)}</dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-rose/20 pt-6">
        <h3 className="text-2xl">{t("delivery")}</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label={t("customer")}>
            {order.customerName} · {order.phoneMasked}
          </Row>
          <Row label={t("method.label")}>{t(`method.${order.deliveryMethod}`)}</Row>
          {!hand && destination && <Row label={t("destination")}>{destination}</Row>}
          {!hand && order.address && <Row label={t("address")}>{order.address}</Row>}
          {hand && <Row label={t("meetingPlace")}>{order.handoverPlace ?? t("arranging")}</Row>}
          {hand && order.handoverAt && <Row label={t("meetingTime")}>{formatDateTime(order.handoverAt, locale)}</Row>}
          {order.trackingNumber && <Row label={t("tracking")}>{order.trackingNumber}</Row>}
        </dl>
      </div>
    </section>
  );
}